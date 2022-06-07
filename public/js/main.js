/* eslint-env jquery, browser */
$(document).ready(() => {});

const ethereumButton = document.querySelector("#web3");
if (ethereumButton) {
  ethereumButton.addEventListener("click", async () => {
    if (typeof window.ethereum === "undefined") {
      return alert("Please install MetaMask!");
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = provider.getSigner();
      const message = `Welcome to NFT Star!

  Click "Sign" button to prove you
  - have access to this wallet;
  - agree to the Terms of Use and Privacy Policy.`;
      const signature = await signer.signMessage(message);

      window.location.replace(
        `/auth/web3?${new URLSearchParams({
          address: await signer.getAddress(),
          digest: ethers.utils.hashMessage(message),
          signature,
        })}`
      );
    } catch (e) {
      console.error(e, "Something goes wrong with MetaMask.");
    }
  });
}

const amount = document.getElementById("amount");
if (amount) {
  document.getElementById("max").addEventListener("click", () => {
    amount.value = amount.getAttribute("max");
  });
}
