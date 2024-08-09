import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

interface Tag {
  name: string;
  value: string;
}

const AOC = "pdKYJSk3n2XuFSt6AX-A7n_DhMmTWxCH3W8dxGBPXjM";

function aoOptions() {
  const [address, setAddress] = useState("");
  const [aocBalance, setAocBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async (process: string) => {
      try {
        const messageResponse = await message({
          process,
          tags: [{ name: "Action", value: "Balance" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        const getBalanceMessage = messageResponse;
        try {
          let { Messages, Error } = await result({
            message: getBalanceMessage,
            process,
          });
          if (Error) {
            alert("Error fetching balances:" + Error);
            return;
          }
          if (!Messages || Messages.length === 0) {
            alert("No messages were returned from ao. Please try later.");
            return;
          }
          const balanceTag = Messages[0].Tags.find(
            (tag: Tag) => tag.name === "Balance"
          );
          const balance = balanceTag
            ? parseFloat((balanceTag.value / 1000).toFixed(4))
            : 0;
          if (process === AOC) {
            setAocBalance(balance);
          }
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchBalance(AOC);
  }, [address]);

  return (
    <div className="border-r border-black">
      <p className="text-lg md:text-center">
        AOC: <span className="font-bold">{aocBalance}</span>
      </p>
    </div>
  );
}
export default aoOptions;
