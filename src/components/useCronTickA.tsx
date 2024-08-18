import { useEffect } from "react";
import { message, createDataItemSigner } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

const useCronTickA = (process: string) => {
  useEffect(() => {
    const checkExpiredContracts = async () => {
      try {
        await message({
          process,
          tags: [{ name: "Action", value: "Check-Expired-Contracts" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        console.log("Expired contracts checked successfully");
      } catch (error) {
        console.error("Error checking expired contracts:", error);
      }
    };

    const intervalId = setInterval(checkExpiredContracts, 600000); // Every minute

    return () => clearInterval(intervalId);
  }, [process]);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        await message({
          process,
          tags: [{ name: "Action", value: "Fetch-Price" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        console.log("Price fetched successfully");
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };

    const intervalId = setInterval(fetchPrice, 650000); // Every minute and 5 seconds

    return () => clearInterval(intervalId);
  }, [process]);

  useEffect(() => {
    const closePositions = async () => {
      try {
        await message({
          process,
          tags: [{ name: "Action", value: "Close-Positions" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        console.log("Positions closed successfully");
      } catch (error) {
        console.error("Error closing positions:", error);
      }
    };

    const intervalId = setInterval(closePositions, 750000); // Every minute and 15 seconds

    return () => clearInterval(intervalId);
  }, [process]);
};

export default useCronTickA;
