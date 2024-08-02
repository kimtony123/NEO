import { useEffect } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

const useCronTick = (process: string) => {
  useEffect(() => {
    const fetchCronTick = async () => {
      try {
        await message({
          process,
          tags: [{ name: "Action", value: "Cron" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
      } catch (error) {
        console.error("Error processing cron tick:", error);
      }
    };

    const intervalId = setInterval(fetchCronTick, 1000000); // Call fetchCronTick every second

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [process]);
};

export default useCronTick;
