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
} from "semantic-ui-react";

import Skeleton from "./Skeleton"; // Adjust the import path as necessary
import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import useCronTick from "./useCronTick";

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

  const [aocBalance, setAocBalance] = useState(0);
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
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [responsemessage, setResponseMessage] = useState<string | null>(null);

  const [claimSuccess, setSuccess] = useState(false);

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
      default:
        break;
    }
  };

  const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const tradeCall = async () => {
    setIsLoadingCall(true);

    // Function to handle the swap and set success state
    const send = async (): Promise<void> => {
      var value = parseInt(betAmountCall);
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
            value: String(expiryDayPut),
          },
          {
            name: "BetAmount",
            value: String(Number(betAmountCall) * 1000000000000),
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
  };

  const tradePut = async () => {
    setIsLoadingPut(true);

    // Function to handle the swap and set success state
    const send = async (): Promise<void> => {
      var value = parseInt(betAmountPut);
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

    const randomIntPut = (min: number, max: number): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    try {
      // Await the send function to ensure it completes before proceeding
      await send();

      // Proceed with creating the trade only if send was successful
      const getPropMessage = await message({
        process: NOT,
        tags: [
          { name: "Action", value: "trade" },
          { name: "TradeId", value: String(randomIntPut(1, 1000000000)) },
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
            value: String(Number(betAmountPut) * 1000000000000),
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
              ContractExpiry: typedDetails.ContractExpiry,
              TradeId: typedDetails.TradeId,
              CreatedTime: typedDetails.CreatedTime,
              ClosingTime: typedDetails.ClosingTime,
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
                ContractExpiry: typedDetails.ContractExpiry,
                TradeId: typedDetails.TradeId,
                CreatedTime: typedDetails.CreatedTime,
                ClosingTime: typedDetails.ClosingTime,
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

  useCronTick(NOT);

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
            ? parseFloat((balanceTag.value / 1000000000000).toFixed(4))
            : 0;
          if (process === USDA) {
            setAocBalance(balance);
          }
        } catch (error) {
          alert("There was an error when loading balances: " + error);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchBalance(USDA);
  }, [address]);

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
      <Header as="h2" color="teal" textAlign="center">
        <Image src="/logox.png" alt="logo" /> Create a Trade.
      </Header>
      <Divider />
      <Grid columns="equal">
        <Divider />
        <Grid.Column>
          <Form size="large">
            <span> USDA Balance: {aocBalance}</span>
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
              <span>Minimum Trade Amount is 0.5 USDA</span>
              <Form.Input
                type="number"
                name="betAmountCall"
                value={betAmountCall}
                onChange={handleInputChange}
                icon="money"
                iconPosition="left"
                placeholder="Amount of USDA."
              />
              <span>Minimum Trade time is 5 minutes</span>
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
            <span> Staked USDA Balance: 0</span>
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
              <span>Minimum Trade Amount is 0.5 USDA</span>
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
            <TableHeaderCell>Closing Price</TableHeaderCell>
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
      <Divider />
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
            <TableHeaderCell>Closing Price</TableHeaderCell>
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
            href="https://github.com/kimtony123/notus-exchange"
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
