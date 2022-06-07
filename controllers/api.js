const weightedRandom = require("weighted-random");
const { ethers } = require("ethers");
const User = require("../models/User");
const constants = require("../config/constants");

const provider = new ethers.providers.JsonRpcProvider(
  process.env.NODE_ENV !== "development"
    ? "https://bscrpc.com"
    : "https://data-seed-prebsc-1-s1.binance.org:8545"
);
const web3 = ethers.Wallet.fromMnemonic(process.env.MNEMONIC).connect(provider);

const abi = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];
const token = new ethers.Contract(
  process.env.NODE_ENV !== "development"
    ? ""
    : "0xB9e0E753630434d7863528cc73CB7AC638a7c8ff",
  abi,
  web3
);

exports.getMe = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  });
};

exports.build = (req, res, next) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }
    const useCard = req.body.useCard || false;

    if (req.body.type === "researchCenter") {
      if (user.isResearchCenterBuilt) {
        return res
          .status(400)
          .json({ message: "Research center already build." });
      }
      if (user.balances.crystals < constants.researchCenter.price) {
        return res.status(400).json({ message: "Insufficient balance." });
      }

      user.isResearchCenterBuilt = true;
      user.balances.crystals -= constants.researchCenter.price;
    } else if (req.body.type === "powerPlant") {
      if (user.powerPlantsBuilt >= constants.powerPlant.maxCount) {
        return res
          .status(400)
          .json({ message: "No space for next power plant." });
      }
      if (!useCard) {
        if (user.balances.crystals < constants.powerPlant.price) {
          return res.status(400).json({ message: "Insufficient balance." });
        }
      } else if (user.powerPlantCards <= 0) {
        return res
          .status(400)
          .json({ message: "Insufficient power plant cards." });
      }

      user.powerPlantsBuilt++;
      user.balances.energy += constants.powerPlant.energyProduction;
      user.balances.crystals -= useCard ? 0 : constants.powerPlant.price;
      if (useCard) {
        user.powerPlantCards--;
      }
    } else if (req.body.type === "expeditionShip") {
      if (!user.isResearchCenterBuilt) {
        return res
          .status(400)
          .json({ message: "Research Center is not built." });
      }
      if (user.balances.crystals < constants.expeditionShip.price) {
        return res.status(400).json({ message: "Insufficient balance." });
      }

      user.expeditionShips++;
      user.crystals -= constants.expeditionShip.price;
    } else if (req.body.type === "crystalFarm") {
      if (user.crystalFarmsBuilt >= constants.crystalFarm.maxCount) {
        return res
          .status(400)
          .json({ message: "No space for next crystal farm." });
      }
      if (!useCard) {
        if (
          user.balances.crystals < constants.crystalFarm.price ||
          user.balances.energy < constants.crystalFarm.energyConsumption
        ) {
          return res.status(400).json({ message: "Insufficient balance." });
        }
      } else if (user.crystalFarmCards <= 0) {
        return res
          .status(400)
          .json({ message: "Insufficient crystal farm cards." });
      }

      user.crystalFarmsBuilt++;
      user.balances.crystals -= useCard ? 0 : constants.crystalFarm.price;
      user.balances.energy -= constants.crystalFarm.energy;
      if (useCard) {
        user.crystalFarmCards--;
      }
    }

    user.save((err) => {
      if (err) {
        return res.status(500).json({ message: err });
      }
      return res.status(201).json({ message: "Successfully built." });
    });
  });
};

exports.sendExpedition = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.expeditionShips <= 0) {
      return res.status(400).json({ message: "No available ships." });
    }
    if (user.expeditionLeftToday <= 0) {
      return res.status(400).json({ message: "No more expeditions today." });
    }
    if (user.expeditionSentAt) {
      return res.status(400).json({ message: "Expedition already sent." });
    }

    user.expeditionLeftToday--;
    user.expeditionEndsOn = Date.now() + constants.expeditionDuration;

    user.save((err) => {
      if (err) {
        return res.status(500).json({ message: err });
      }
      res.status(201).json({ message: "Expedition successfully sent." });
    });
  });
};

exports.getExpedition = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }

    const { expeditionEndsOn } = user;
    if (!expeditionEndsOn) {
      return res.status(404).json({ message: "No sent expeditions." });
    }

    if (expeditionEndsOn.getTime() <= new Date().getTime()) {
      const outcomes = [
        {
          weight: 10,
          reward: "crystals",
          amount: Math.floor(Math.random() * 7) + 3,
        },
        {
          weight: 0.01,
          reward: "crystalFarmBox",
        },
        {
          weight: 10,
          reward: "lostExpeditionShip",
        },
        {
          weight: 50,
          reward: "nothing",
        },
        {
          weight: 20,
          reward: "expeditionShip",
        },
        {
          weight: 5,
          reward: "powerPlantCard",
        },
        {
          weight: 5,
          reward: "crystalFarmCard",
        },
      ];
      const weights = outcomes.map((outcome) => outcome.weight);

      const outcome = outcomes[weightedRandom(weights)];

      if (outcome.reward === "crystals") {
        user.balances.crystals += outcome.amount;
      } else if (outcome.reward === "crystalFarmBox") {
        user.crystalFarmBoxes++;
      } else if (outcome.reward === "lostExpeditionShip") {
        user.expeditionShips--;
      } else if (outcome.reward === "expeditionShip") {
        user.expeditionShips++;
      } else if (outcome.reward === "powerPlantCard") {
        user.powerPlantCards++;
      } else if (outcome.reward === "crystalFarmCard") {
        user.crystalFarmCards++;
      }
      user.expeditionEndsOn = null;

      user.save((err) => {
        if (err) {
          return res.status(404).json({ message: err });
        }
        res.status(200).json({ result: outcome });
      });
    } else {
      res.status(200).json({ expeditionEndsOn });
    }
  });
};

/* exports.swap = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }

    const { direction } = req.body;
    if (direction !== "sell" || direction !== "buy") {
      return res.status(400).json({ message: "Invalid swap." });
    }

    let tx;
    if (direction === "sell") {
      const { amount } = req.body;
      const a = parseInt(a, 10);
      if (a > user.crystals) {
        return res.status(400).json({ message: "Insufficient balance." });
      }

      user.balances.crystal -= a;
    } else {
      const { owner, spender, value, deadline, v, r, s } = req.body;
      token.permit(owner, spender, value, deadline, v, r, s);
    }

    user.save((err) => {
      if (err) {
        return res.status(404).json({ message: err });
      }
      res.status(200).json({ tx });
    });
  });
}; */

exports.postSell = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      req.flash("errors", { msg: "User not found." });
      return res.redirect("/sell");
    }

    const { amount } = req.body;
    const a = parseInt(amount, 10);
    if (a > user.balances.crystals) {
      req.flash("errors", { msg: "Insufficient balance." });
      return res.redirect("/sell");
    }

    token
      .decimals()
      .then((decimals) => ethers.utils.parseUnits(a.toString(), decimals))
      .then((a2) => token.transfer(user.address, a2))
      .then((tx) => tx.wait())
      .then((tx) => {
        user.balances.crystals -= a;

        user.save((err) => {
          if (err) {
            req.flash("errors", { msg: "Server error." });
            return res.redirect("/sell");
          }
          req.flash("success", { msg: "Successfull sell!" });
          return res.redirect("/sell");
        });
      })
      .catch((e) => {
        req.flash("errors", { msg: "Can't send tokens." });
        return res.redirect("/sell");
      });
  });
};

exports.sell = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }

    res.render("sell", {
      title: "Sell",
      crystals: user.balances.crystals,
    });
  });
};

exports.buy = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      return res.status(404).json({ message: "User not found." });
    }

    Promise.all([token.decimals(), token.balanceOf(user.address)]).then(
      ([decimals, balance]) => {
        res.render("buy", {
          title: "buy",
          tokens: ethers.utils.formatUnits(balance, decimals.toString()),
        });
      }
    );
  });
};

exports.postBuy = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      req.flash("errors", { msg: "User not found." });
      return res.redirect("/buy");
    }

    const { amount } = req.body;
    const a = parseInt(amount, 10);
  });
};