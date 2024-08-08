import { useEffect } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

const completeTrade = (process: string) => {
  useEffect(() => {
    const fetchCronTick = async () => {
      try {
        await message({
          process,
          tags: [{ name: "Action", value: "completeTrade" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
      } catch (error) {
        console.error("Error completing Trade:", error);
      }
    };

    const intervalId = setInterval(fetchCronTick, 100000); // Call fetchCronTick every second

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [process]);
};

export default completeTrade;
