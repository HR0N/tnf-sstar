const argon2 = require('phc-argon2');
const crypto = require('crypto');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: Boolean,

  balances: {
    energy: {
      type: Number,
      default: 0
    },
    coins: {
      type: Number,
      default: 250
    },
    crystals: {
      type: Number,
      default: 1000
    },
  },

  isResearchCenterBuilt: {
    type: Boolean,
    default: false,
  },

  powerPlantCards: {
    type: Number,
    default: 0
  },

  crystalFarmCards: {
    type: Number,
    default: 0
  },

  crystalFarmBoxes: {
    type: Number,
    default: 0
  },

  powerPlantsBuilt: {
    type: Number,
    default: 0,
  },

  crystalFarmsBuilt: {
    type: Number,
    default: 0,
  },

  firstLevelCrystalFarmsBuilt: {
    type: Number,
    default: 0,
  },

  secondLevelCrystalFarmsBuilt: {
    type: Number,
    default: 0,
  },

  thirdLevelCrystalFarmsBuilt: {
    type: Number,
    default: 0,
  },

  expeditionEndsOn: Date,
  expeditionLeftToday: {
    type: Number,
    default: 3
  },
  expeditionShips: {
    type: Number,
    default: 0
  },

  address: String,

  snapchat: String,
  facebook: String,
  twitter: String,
  google: String,
  github: String,
  instagram: String,
  linkedin: String,
  steam: String,
  twitch: String,
  quickbooks: String,
  tokens: Array,

  profile: {
    name: String,
    gender: String,
    location: String,
    website: String,
    picture: String
  }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre('save', async function save(next) {
  const user = this;
  if (!user.isModified('password')) { return next(); }
  try {
    user.password = await argon2.hash(user.password);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword, cb) {
  try {
    cb(null, await argon2.verify(this.password, candidatePassword));
  } catch (err) {
    cb(err);
  }
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash('md5').update(this.email).digest('hex');
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
