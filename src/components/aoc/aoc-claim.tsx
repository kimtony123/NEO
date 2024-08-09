import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import { Button } from "semantic-ui-react";

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

function aocClaim() {
  const [claimSuccess, setSuccess] = useState(false);

  const claim = async () => {
    try {
      const getSwapMessage = await message({
        process: AOC,
        tags: [{ name: "Action", value: "RequestTokens" }],
        signer: createDataItemSigner(window.arweaveWallet),
      });
      try {
        let { Messages, Error } = await result({
          message: getSwapMessage,
          process: AOC,
        });
        if (Error) {
          alert("Error handling claim:" + Error);
          return;
        }
        if (!Messages || Messages.length === 0) {
          alert("No messages were returned from ao. Please try later.");
          return;
        }
        const actionTag = Messages[0].Tags.find(
          (tag: Tag) => tag.name === "Action"
        );
        if (actionTag.value === "Debit-Notice") {
          setSuccess(true);
        }
      } catch (error) {
        alert("There was an error when claiming AOC: " + error);
      }
    } catch (error) {
      alert("There was an error claiming: " + error);
    }
  };
}

export default aocClaim;
