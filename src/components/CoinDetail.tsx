import React from "react";
import { useParams } from "react-router-dom";
import useAxios from "../hooks/useAxios"; // Adjust the import path as necessary
import useAxiosm from "../hooks/useAxiosm";
import {
  Button,
  Header,
  Grid,
  Divider,
  Form,
  Segment,
  Image,
  Table,
  Message,
  Menu,
  MenuItem,
  FormGroup,
  FormButton,
  FormInput,
  MenuMenu,
  Container,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableFooter,
  Icon,
  Input,
} from "semantic-ui-react";

import Skeleton from "./Skeleton"; // Adjust the import path as necessary
import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import useCronTick from "./useCronTick";
import completeTrade from "./completeTrade";
import clearClosed from "./clearClosed.tsx";

// Define types for route parameters
type RouteParams = {
  id: string;
};
interface Tag {
  name: string;
  value: string;
}

type CoinResponse = {
  name: string;
  image: {
    small: string;
  };
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  id: string;
  symbol: string;
  market_data: {
    current_price: {
      usd: number;
    };
  };
};

interface TradeDetails {
  UserId: string;
  TradeId: number;
  BetAmount: number;
  ContractType: string;
  Name: string;
  AssetPrice: string;
  ContractStatus: string;
  AssetId: string;
  ContractExpiry: string;
  CreatedTime: string;
  ClosingPrice: number;
  ClosingTime: number;
  Payout: number;
  Outcome: string;
}

interface Trade {
  TradeId: number;
  UserId: string;
  BetAmount: number;
  ContractType: string;
  Name: string;
  AssetPrice: string;
  ContractStatus: string;
  AssetId: string;
  ContractExpiry: string;
  CreatedTime: string;
  ClosingPrice: number;
  ClosingTime: number;
  Payout: number;
  Outcome: string;
}
interface Transaction {
  user: string;
  transactionid: string;
  amount: string;
  type: string;
  balance: string;
  timestamp: string;
}

// Time Decay Function
const timeDecay = (expiryMinutes: number) => {
  const decayFactor = Math.exp(-expiryMinutes / 525600); // assuming 60 minutes for full decay
  return Math.max(decayFactor, 0.01); // Ensure a minimum decay factor to prevent infinity payoff
};

// Adjust Probability Function
const adjustProbability = (
  prob: number,
  betAmount: number,
  spread: number = 0,
  expiryMinutes: number = 0
) => {
  // Apply a nonlinear transformation (e.g., exponential) to adjust probability
  const adjustedProb = Math.exp(prob / 100) / Math.exp(1);

  // Apply time decay
  const decayFactor = timeDecay(expiryMinutes);
  const timeAdjustedProb = adjustedProb * decayFactor;

  const betAdjustmentFactor = 1 + betAmount / 10000000;
  const finalAdjustedProb = timeAdjustedProb / betAdjustmentFactor;

  return finalAdjustedProb * (1 + spread);
};

// Define the CoinDetail component
const CoinDetail: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const { response } = useAxios<CoinResponse>(`coins/${id}`);
  console.log(response);

  const permissions: PermissionType[] = [
    "ACCESS_ADDRESS",
    "SIGNATURE",
    "SIGN_TRANSACTION",
    "DISPATCH",
  ];

  const NOT = "wPmY5MO0DPWpgUGGj8LD7ZmuPmWdYZ2NnELeXdGgctQ";
  const USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";

  const [interest, setInterest] = useState(50.258); // Example accrued interest
  const [amount, setAmount] = useState("");
  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingDeposit, setIsLoadingDeposit] = useState(false);
  const [isLoadingWithdraw, setIsLoadingWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transactionlist, setTransactionDetails] = useState<Transaction[]>([]);
  const [aocBalance, setAocBalance] = useState(0);
  const [usdaBalance, setUsdaBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [betAmountCall, setBetAmountCall] = useState("");
  const [betAmountPut, setBetAmountPut] = useState("");
  const [opentrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedtrades, setClosedTrades] = useState<Trade[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [oddsDown, setOddsDown] = useState<string>("");
  const [oddsUp, setOddsUp] = useState<string>("");
  const [expiryDayCall, setExpiryDayCall] = useState("");
  const [expiryDayPut, setExpiryDayPut] = useState("");
  const [isLoadingCall, setIsLoadingCall] = useState(false);
  const [isLoadingPut, setIsLoadingPut] = useState(false);

  const [responsemessage, setResponseMessage] = useState<string | null>(null);

  const [sendSuccess, setSuccess] = useState(false);

  useEffect(() => {
    calculatePayoffs();
  }, [betAmountCall, betAmountPut, expiryDayCall, expiryDayPut]);

  const calculatePayoffs = () => {
    if (!response) {
      setErrorMessage("Response data is missing.");
      return;
    }

    // Get sentiment vote percentages
    let sentimentVotesDownPercentage =
      response?.sentiment_votes_down_percentage!;
    let sentimentVotesUpPercentage = response?.sentiment_votes_up_percentage!;

    // Ensure the difference between the percentages is at most 15
    const maxDifference = 15;
    const actualDifference = Math.abs(
      sentimentVotesDownPercentage - sentimentVotesUpPercentage
    );

    if (actualDifference > maxDifference) {
      const totalSentiment =
        sentimentVotesDownPercentage + sentimentVotesUpPercentage;
      const averageSentiment = totalSentiment / 2;

      if (sentimentVotesDownPercentage > sentimentVotesUpPercentage) {
        sentimentVotesDownPercentage = Math.min(
          averageSentiment + maxDifference / 2,
          100
        );
        sentimentVotesUpPercentage = Math.max(
          averageSentiment - maxDifference / 2,
          0
        );
      } else {
        sentimentVotesUpPercentage = Math.min(
          averageSentiment + maxDifference / 2,
          100
        );
        sentimentVotesDownPercentage = Math.max(
          averageSentiment - maxDifference / 2,
          0
        );
      }
    }

    const expiryMinutesCall = expiryDayCall; // Get the expiry time in minutes from input
    const expiryMinutesPut = expiryDayPut; // Get the expiry time in minutes from input

    // Determine which side has the higher probability
    const isDownHigher =
      sentimentVotesDownPercentage > sentimentVotesUpPercentage;

    // Define the spread
    const totalSpread = 0.2;

    // Apply the spread split
    const lowerSpread = (2 / 3) * totalSpread;
    const higherSpread = (1 / 3) * totalSpread;

    const adjustedDownProbability = adjustProbability(
      sentimentVotesDownPercentage,
      Number(betAmountPut),
      isDownHigher ? higherSpread : lowerSpread,
      expiryMinutesPut
    );
    const adjustedUpProbability = adjustProbability(
      sentimentVotesUpPercentage,
      Number(betAmountCall),
      isDownHigher ? lowerSpread : higherSpread,
      expiryMinutesCall
    );

    // Normalize the probabilities to ensure they sum to 1
    const totalAdjustedProbability =
      adjustedDownProbability + adjustedUpProbability;
    const normalizedDownProbability =
      adjustedDownProbability / totalAdjustedProbability;
    const normalizedUpProbability =
      adjustedUpProbability / totalAdjustedProbability;

    // Calculate the odds
    setOddsDown((1 / normalizedDownProbability - 0.3).toFixed(3));
    setOddsUp((1 / normalizedUpProbability - 0.3).toFixed(3));
    setErrorMessage("");
  };

  function reloadPage(forceReload: boolean = false): void {
    if (forceReload) {
      // Force reload from the server
      location.href = location.href;
    } else {
      // Reload using the cache
      location.reload();
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    switch (name) {
      case "betAmountCall":
        setBetAmountCall(value);
        break;
      case "betAmountPut":
        setBetAmountPut(value);
        break;
      case "expiryDayCall":
        setExpiryDayCall(value);
        break;
      case "expiryDayPut":
        setExpiryDayPut(value);
        break;
      case "depositAmount":
        setDepositAmount(value);
        break;
      case "withdrawAmount":
        setWithdrawAmount(value);
        break;
      default:
        break;
    }
  };

  const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const deposit = async () => {
    setIsLoadingDeposit(true);

    // Function to handle the swap and set success state
    const send = async (): Promise<void> => {
      var value = parseInt(depositAmount);
      var units = value * 1000000000000;
      var credUnits = units.toString();
      try {
        const getSwapMessage = await message({
          process: USDA,
          tags: [
            { name: "Action", value: "Transfer" },
            { name: "Recipient", value: NOT },
            { name: "Quantity", value: credUnits },
          ],
          signer: createDataItemSigner(window.arweaveWallet),
        });

        let { Messages, Error } = await result({
          message: getSwapMessage,
          process: USDA,
        });
        if (Error) {
          alert("Error Sending USDA: " + Error);
          throw new Error(Error);
        }
        if (!Messages || Messages.length === 0) {
          alert("No messages were returned from ao. Please try later.");
          throw new Error("No messages were returned from ao.");
        }
        const actionTag = Messages[0].Tags.find(
          (tag: Tag) => tag.name === "Action"
        );
        if (actionTag.value === "Debit-Notice") {
          setSuccess(true);
        }
      } catch (error) {
        alert("There was an error sending USDA: " + error);
        throw error;
      }
    };
    try {
      // Await the send function to ensure it completes before proceeding
      await send();

      // Proceed with creating the trade only if send was successful
      const getPropMessage = await message({
        process: NOT,
        tags: [
          { name: "Action", value: "deposit" },
          {
            name: "Amount",
            value: String(parseInt(depositAmount) * 1000000000000),
          },
        ],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      let { Messages, Error } = await result({
        message: getPropMessage,
        process: NOT,
      });
      if (Error) {
        alert("Error Depositing : " + Error);
        return;
      }
      if (!Messages || Messages.length === 0) {
        alert("No messages were returned from ao. Please try later.");
        return;
      }
      alert(Messages[0].Data);
      setDepositAmount("");
    } catch (error) {
      alert("There was an error in the trade process: " + error);
    }

    setIsLoadingDeposit(false);
    reloadPage(true);
  };

  const withdraw = async () => {
    setIsLoadingWithdraw(true);
    var value = parseInt(withdrawAmount);
    var units = value * 1000000000000;
    var credUnits = units.toString();
    try {
      // Proceed with creating the trade only if send was successful
      const getPropMessage = await message({
        process: NOT,
        tags: [
          { name: "Action", value: "withdraw" },
          {
            name: "Amount",
            value: String(credUnits),
          },
        ],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      let { Messages, Error } = await result({
        message: getPropMessage,
        process: NOT,
      });
      if (Error) {
        alert("Error Withdrawing : " + Error);
        return;
      }
      if (!Messages || Messages.length === 0) {
        alert("No messages were returned from ao. Please try later.");
        return;
      }
      alert(Messages[0].Data);
      setWithdrawAmount("");
    } catch (error) {
      alert("There was an error in the trade process: " + error);
    }
    setIsLoadingWithdraw(false);
    reloadPage(true);
  };

  const tradeCall = async () => {
    setIsLoadingCall(true);
    var value = parseInt(betAmountCall);
    var units = value * 1000000000000;
    var credUnits = units.toString();
    try {
      // Proceed with creating the trade only if send was successful
      const getPropMessage = await message({
        process: NOT,
        tags: [
          { name: "Action", value: "trade" },
          { name: "TradeId", value: String(randomInt(1, 1000000000)) },
          { name: "Name", value: String(response?.name!) },
          { name: "AssetId", value: String(response?.symbol!) },
          {
            name: "AssetPrice",
            value: String(response?.market_data.current_price.usd),
          },
          { name: "CreatedTime", value: String(Date.now()) },
          { name: "ContractType", value: "Call" },
          { name: "ContractStatus", value: "Open" },
          {
            name: "ContractExpiry",
            value: String(expiryDayCall),
          },
          {
            name: "BetAmount",
            value: credUnits,
          },
          { name: "Payout", value: String(oddsDown) },
        ],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      let { Messages, Error } = await result({
        message: getPropMessage,
        process: NOT,
      });
      if (Error) {
        alert("Error trading : " + Error);
        return;
      }
      if (!Messages || Messages.length === 0) {
        alert("No messages were returned from ao. Please try later.");
        return;
      }
      alert(Messages[0].Data);
      setBetAmountCall("");
      setExpiryDayCall("");
    } catch (error) {
      alert("There was an error in the trade process: " + error);
    }

    setIsLoadingCall(false);
    reloadPage(true);
  };

  const tradePut = async () => {
    setIsLoadingPut(true);
    var value = parseInt(betAmountPut);
    var units = value * 1000000000000;
    var credUnits = units.toString();
    try {
      // Proceed with creating the trade only if send was successful
      const getPropMessage = await message({
        process: NOT,
        tags: [
          { name: "Action", value: "trade" },
          { name: "TradeId", value: String(randomInt(1, 1000000000)) },
          { name: "Name", value: String(response?.name!) },
          { name: "AssetId", value: String(response?.symbol!) },
          {
            name: "AssetPrice",
            value: String(response?.market_data.current_price.usd),
          },
          { name: "CreatedTime", value: String(Date.now()) },
          { name: "ContractType", value: "Put" },
          { name: "ContractStatus", value: "Open" },
          {
            name: "ContractExpiry",
            value: String(expiryDayPut),
          },
          {
            name: "BetAmount",
            value: credUnits,
          },
          { name: "Payout", value: String(oddsDown) },
        ],
        signer: createDataItemSigner(window.arweaveWallet),
      });

      let { Messages, Error } = await result({
        message: getPropMessage,
        process: NOT,
      });
      if (Error) {
        alert("Error trading : " + Error);
        return;
      }
      if (!Messages || Messages.length === 0) {
        alert("No messages were returned from ao. Please try later.");
        return;
      }
      alert(Messages[0].Data);
      setBetAmountPut("");
      setExpiryDayPut("");
    } catch (error) {
      alert("There was an error in the trade process: " + error);
    }
    setIsLoadingPut(false);
    reloadPage(true);
  };

  useEffect(() => {
    const fetchOpenTrades = async () => {
      try {
        const messageResponse = await message({
          process: NOT,
          tags: [{ name: "Action", value: "openTrades" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        const getProposalsMessage = messageResponse;
        try {
          let { Messages, Error } = await result({
            message: getProposalsMessage,
            process: NOT,
          });
          if (Error) {
            alert("Error fetching proposals:" + Error);
            return;
          }
          if (!Messages || Messages.length === 0) {
            alert("No messages were returned from ao. Please try later.");
            return;
          }
          const data = JSON.parse(Messages[0].Data);
          const openTradesData = Object.entries(data).map(([name, details]) => {
            const typedDetails: TradeDetails = details as TradeDetails;
            return {
              name,
              BetAmount: typedDetails.BetAmount / 1000000000000,
              ContractType: typedDetails.ContractType,
              Name: typedDetails.Name,
              AssetPrice: typedDetails.AssetPrice,
              ContractStatus: typedDetails.ContractStatus,
              AssetId: typedDetails.AssetId,
              ContractExpiry: new Date(
                typedDetails.ContractExpiry
              ).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false, // Use 24-hour format
              }),
              CreatedTime: new Date(typedDetails.CreatedTime).toLocaleString(
                "en-US",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false, // Use 24-hour format
                }
              ),
              TradeId: typedDetails.TradeId,
              ClosingTime: typedDetails.ClosingTime
                ? new Date(typedDetails.ClosingTime).toLocaleString("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "Pending",
              ClosingPrice: typedDetails.ClosingPrice,
              Payout: typedDetails.Payout,
              UserId: typedDetails.UserId,
              Outcome: typedDetails.Outcome,
            };
          });
          setOpenTrades(openTradesData);
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchOpenTrades();
  }, []);

  useEffect(() => {
    const fetchClosedTrades = async () => {
      try {
        const messageResponse = await message({
          process: NOT,
          tags: [{ name: "Action", value: "closedTrades" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        const getProposalsMessage = messageResponse;
        try {
          let { Messages, Error } = await result({
            message: getProposalsMessage,
            process: NOT,
          });
          if (Error) {
            alert("Error fetching proposals:" + Error);
            return;
          }
          if (!Messages || Messages.length === 0) {
            alert("No messages were returned from ao. Please try later.");
            return;
          }
          const data = JSON.parse(Messages[0].Data);
          const closedTradesData = Object.entries(data).map(
            ([name, details]) => {
              const typedDetails: TradeDetails = details as TradeDetails;
              return {
                name,
                BetAmount: typedDetails.BetAmount / 1000000000000,
                ContractType: typedDetails.ContractType,
                Name: typedDetails.Name,
                AssetPrice: typedDetails.AssetPrice,
                ContractStatus: typedDetails.ContractStatus,
                AssetId: typedDetails.AssetId,
                TradeId: typedDetails.TradeId,
                ContractExpiry: new Date(
                  typedDetails.ContractExpiry
                ).toLocaleString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false, // Use 24-hour format
                }),
                CreatedTime: new Date(typedDetails.CreatedTime).toLocaleString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false, // Use 24-hour format
                  }
                ),
                ClosingTime: typedDetails.ClosingTime
                  ? new Date(typedDetails.ClosingTime).toLocaleString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "Pending",
                ClosingPrice: typedDetails.ClosingPrice,
                Payout: typedDetails.Payout,
                UserId: typedDetails.UserId,
                Outcome: typedDetails.Outcome,
              };
            }
          );
          setClosedTrades(closedTradesData);
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchClosedTrades();
  }, []);

  useEffect(() => {
    const fetchBalanceUsda = async (process: string) => {
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
            ? parseFloat((balanceTag.value / 1000000000000).toFixed(4))
            : 0;
          if (process === USDA) {
            setUsdaBalance(balance);
          }
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchBalanceUsda(USDA);
  }, [address]);

  useEffect(() => {
    const fetchBalanceAoc = async (process: string) => {
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
            ? parseFloat((balanceTag.value / 1000000000000).toFixed(4))
            : 0;
          if (process === NOT) {
            setAocBalance(balance);
          }
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchBalanceAoc(NOT);
  }, [address]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const messageResponse = await message({
          process: NOT,
          tags: [{ name: "Action", value: "view_transactions" }],
          signer: createDataItemSigner(window.arweaveWallet),
        });
        const getProposalsMessage = messageResponse;
        try {
          let { Messages, Error } = await result({
            message: getProposalsMessage,
            process: NOT,
          });
          if (Error) {
            alert("Error fetching transactions:" + Error);
            return;
          }
          if (!Messages || Messages.length === 0) {
            alert("No messages were returned from ao. Please try later.");
            return;
          }
          const data = JSON.parse(Messages[0].Data);
          const openTradesData = Object.entries(data).map(([name, details]) => {
            const typedDetails: Transaction = details as Transaction;
            return {
              user: typedDetails.user,
              transactionid: typedDetails.transactionid,
              amount: typedDetails.amount / 1000000000000,
              type: typedDetails.type,
              balance: typedDetails.balance / 1000000000000,
              timestamp: new Date(typedDetails.timestamp).toLocaleString(
                "en-US",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false, // Use 24-hour format
                }
              ),
            };
          });
          setTransactionDetails(openTradesData);
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchTransactions();
  }, []);

  useCronTick(NOT);
  completeTrade(NOT);

  if (!response) {
    return (
      <div className="wrapper-container mt-8">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-72 w-full mb-10" />
      </div>
    );
  }

  return (
    <Container>
      <Menu pointing>
        <MenuMenu position="left">
          <MenuItem>
            <Form>
              <Form.Input
                type="text"
                name="withdrawAmount"
                value={withdrawAmount}
                onChange={handleInputChange}
                icon="money"
                iconPosition="left"
                placeholder="Amount of USDA."
              />
              <Button
                secondary
                fluid
                onClick={withdraw}
                style={{ marginTop: "10px" }}
                loading={isLoadingWithdraw}
              >
                Withdraw
              </Button>
            </Form>
          </MenuItem>
        </MenuMenu>
        <MenuMenu position="right">
          <MenuItem>
            <Form>
              <Form.Input
                type="number"
                name="depositAmount"
                value={depositAmount}
                onChange={handleInputChange}
                icon="money"
                iconPosition="left"
                placeholder="Amount of USDA."
              />
              <Button
                primary
                fluid
                onClick={deposit}
                style={{ marginTop: "10px" }}
                loading={isLoadingDeposit}
              >
                Deposit.
              </Button>
            </Form>
          </MenuItem>
        </MenuMenu>
      </Menu>
      <Header as="h2" color="teal" textAlign="center">
        <Image src="/logox.png" alt="logo" /> Create a Trade.
      </Header>
      <Divider />
      <Grid columns="equal">
        <Divider />
        <Grid.Column>
          <Form size="large">
            <span> NEO Balance: {aocBalance}</span>
            <Segment stacked>
              <Image src={response.image.small} wrapped ui={false} />
              <span> Asset Name: {response.name}</span>
              <Divider />
              <span>Asset Id : {response.id}</span>
              <Divider />
              <span>
                Asset Price : {response.market_data.current_price.usd}
              </span>
              <Divider />
              <span>Minimum Trade Amount is 0.5 USDA, Max is 20 USDA</span>
              <Form.Input
                type="number"
                name="betAmountCall"
                value={betAmountCall}
                onChange={handleInputChange}
                icon="money"
                iconPosition="left"
                placeholder="Amount of USDA."
              />
              <span>Minimum Trade time is 5 minutes.</span>
              <Form.Input
                fluid
                name="expiryDayCall"
                icon="calendar alternate outline"
                iconPosition="left"
                placeholder="Expiry in Minutes"
                type="number"
                value={expiryDayCall}
                onChange={handleInputChange}
              />
              <Divider />
              <span>Payoff: {oddsUp}</span>
              <Button
                onClick={tradeCall}
                color="teal"
                fluid
                size="small"
                loading={isLoadingCall}
              >
                Call
              </Button>
            </Segment>
          </Form>
        </Grid.Column>
        <Grid.Column>
          <Form size="large">
            <span> USDA Balance: {usdaBalance}</span>
            <Segment stacked>
              <Image src={response.image.small} wrapped ui={false} />
              <span> Asset Name: {response.name}</span>
              <Divider />
              <span>Asset Id : {response.id}</span>
              <Divider />
              <span>
                Asset Price : {response.market_data.current_price.usd}
              </span>
              <Divider />
              <span>Minimum Trade Amount is 0.5 USDA, Max is 20 USDA</span>
              <Form.Input
                type="number"
                name="betAmountPut"
                value={betAmountPut}
                onChange={handleInputChange}
                icon="money"
                iconPosition="left"
                placeholder="Amount of USDA."
              />
              <span>Minimum Trade time is 5 minutes</span>
              <Form.Input
                fluid
                name="expiryDayPut"
                icon="calendar alternate outline"
                iconPosition="left"
                placeholder="Expiry in Minutes"
                type="number"
                value={expiryDayPut}
                onChange={handleInputChange}
              />
              <Divider />
              <span>Payoff: {oddsDown}</span>
              <Button
                onClick={tradePut}
                color="red"
                fluid
                size="small"
                loading={isLoadingPut}
              >
                Put
              </Button>
            </Segment>
          </Form>
        </Grid.Column>
      </Grid>
      <Divider />
      <Grid.Row>
        <Grid.Column width={16}>
          <Segment raised style={{ overflowX: "auto", maxWidth: "100%" }}>
            <Header as="h3" textAlign="center">
              Your Transaction History
            </Header>
            <Table celled>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>tId</Table.HeaderCell>
                  <Table.HeaderCell>user</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>type</Table.HeaderCell>
                  <Table.HeaderCell>Balance</Table.HeaderCell>
                  <Table.HeaderCell>Timestamp</Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {transactionlist.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>{transaction.transactionid}</TableCell>
                    <TableCell>{transaction.user}</TableCell>
                    <TableCell>{transaction.amount}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.balance}</TableCell>
                    <TableCell>{transaction.timestamp}</TableCell>
                  </TableRow>
                ))}
              </Table.Body>
            </Table>
          </Segment>
        </Grid.Column>
      </Grid.Row>
      <Divider />
      <Grid.Row>
        <Grid.Column width={16}>
          <Segment raised style={{ overflowX: "auto", maxWidth: "100%" }}>
            <Header as="h2" color="teal" textAlign="center">
              <Image src="/logox.png" alt="logo" /> Open Trades.
            </Header>
            <Table celled>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>ProcessId</TableHeaderCell>
                  <TableHeaderCell>Asset Name</TableHeaderCell>
                  <TableHeaderCell>Asset Price</TableHeaderCell>
                  <TableHeaderCell>Contract Type</TableHeaderCell>
                  <TableHeaderCell>Trade Amount</TableHeaderCell>
                  <TableHeaderCell>Created Time</TableHeaderCell>
                  <TableHeaderCell>Contract Expiry</TableHeaderCell>
                  <TableHeaderCell>Contract Status</TableHeaderCell>
                  <TableHeaderCell>Closing Time</TableHeaderCell>
                  <TableHeaderCell>
                    Real world Data Powered by Orbitco
                    <Image src="/orbit.png" />
                  </TableHeaderCell>
                  <TableHeaderCell>Payout</TableHeaderCell>
                  <TableHeaderCell>Outcome</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opentrades.map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell>{trade.UserId}</TableCell>
                    <TableCell>{trade.Name}</TableCell>
                    <TableCell>{trade.AssetPrice}</TableCell>
                    <TableCell>{trade.ContractType}</TableCell>
                    <TableCell>{trade.BetAmount}</TableCell>
                    <TableCell>{trade.CreatedTime}</TableCell>
                    <TableCell> {trade.ContractExpiry}</TableCell>
                    <TableCell>{trade.ContractStatus}</TableCell>
                    <TableCell>{trade.ClosingTime}</TableCell>
                    <TableCell>{trade.ClosingPrice}</TableCell>
                    <TableCell>{trade.Payout}</TableCell>
                    <TableCell>{trade.Outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Segment>
        </Grid.Column>
      </Grid.Row>
      <Divider />
      <Grid.Row>
        <Grid.Column width={16}>
          <Segment raised style={{ overflowX: "auto", maxWidth: "100%" }}>
            <Header as="h2" color="teal" textAlign="center">
              <Image src="/logox.png" alt="logo" /> Closed Trades.
            </Header>
            <Table celled>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>ProcessId</TableHeaderCell>
                  <TableHeaderCell>Asset Name</TableHeaderCell>
                  <TableHeaderCell>Asset Price</TableHeaderCell>
                  <TableHeaderCell>Contract Type</TableHeaderCell>
                  <TableHeaderCell>Trade Amount</TableHeaderCell>
                  <TableHeaderCell>Created Time</TableHeaderCell>
                  <TableHeaderCell>Contract Expiry</TableHeaderCell>
                  <TableHeaderCell>Contract Status</TableHeaderCell>
                  <TableHeaderCell>Closing Time</TableHeaderCell>
                  <TableHeaderCell>
                    Real-World Data Powered by Orbitco
                    <Image src="/orbit.png" />
                  </TableHeaderCell>
                  <TableHeaderCell>Payout</TableHeaderCell>
                  <TableHeaderCell>Outcome</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedtrades.map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell>{trade.UserId}</TableCell>
                    <TableCell>{trade.Name}</TableCell>
                    <TableCell>{trade.AssetPrice}</TableCell>
                    <TableCell>{trade.ContractType}</TableCell>
                    <TableCell>{trade.BetAmount}</TableCell>
                    <TableCell>{trade.CreatedTime}</TableCell>
                    <TableCell>{trade.ContractExpiry}</TableCell>
                    <TableCell>{trade.ContractStatus}</TableCell>
                    <TableCell>{trade.ClosingTime}</TableCell>
                    <TableCell>{trade.ClosingPrice}</TableCell>
                    <TableCell>{trade.Payout}</TableCell>
                    <TableCell>{trade.Outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Segment>
        </Grid.Column>
      </Grid.Row>
      <Divider />
      <Menu>
        <MenuItem href="https://notus-memeframe.vercel.app/" header>
          Notus DAO.
        </MenuItem>

        <MenuItem>
          <Button
            href="https://x.com/NotusOptions"
            content="Twitter."
            icon="twitter"
            labelPosition="right"
          />
        </MenuItem>
        <MenuItem position="right">
          <Button
            href="https://github.com/kimtony123/NEO"
            content="Github."
            icon="github"
            labelPosition="left"
          />
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default CoinDetail;
