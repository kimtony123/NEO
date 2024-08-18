import {
  Container,
  Header,
  Form,
  Button,
  Grid,
  Segment,
  Statistic,
  Divider,
  Table,
  TableRow,
  TableCell,
} from "semantic-ui-react";
import "./../BankingHomepage.css"; // Custom CSS for styling

import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

interface Tag {
  name: string;
  value: string;
}

interface Transaction {
  user: string;
  transactionid: string;
  amount: string;
  type: string;
  balance: string;
  timestamp: string;
}

const BankingHomepage = () => {
  const [aocBalance, setAocBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [interest, setInterest] = useState(50.258); // Example accrued interest
  const [amount, setAmount] = useState("");
  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingDeposit, setIsLoadingDeposit] = useState(false);
  const [isLoadingWithdraw, setIsLoadingWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sendSuccess, setSuccess] = useState(false);
  const [transactionlist, setTransactionDetails] = useState<Transaction[]>([]);

  const permissions: PermissionType[] = [
    "ACCESS_ADDRESS",
    "SIGNATURE",
    "SIGN_TRANSACTION",
    "DISPATCH",
  ];

  const NOT = "Qnw4WFZw3nI7GMarFpxr5hQjlH-VcxSaekXdE4EU-Sg";
  const USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    switch (name) {
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

  function reloadPage(forceReload: boolean = false): void {
    if (forceReload) {
      // Force reload from the server
      location.href = location.href;
    } else {
      // Reload using the cache
      location.reload();
    }
  }

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
    fetchBalance(NOT);
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

  return (
    <Container className="banking-container">
      <Header as="h1" textAlign="center" className="banking-header">
        NEO Decentralized Hedge Fund.
      </Header>
      <Divider />
      <Grid columns={2} stackable>
        <Grid.Row>
          <Grid.Column>
            <Segment raised>
              <Statistic>
                <Statistic.Label>Current Balance</Statistic.Label>
                <Statistic.Value>${aocBalance.toFixed(2)} USDA</Statistic.Value>
              </Statistic>
              <Divider />
              <Statistic color="green">
                <Statistic.Label>Accrued Returns.</Statistic.Label>
                <Statistic.Value>{interest.toFixed(4)}%</Statistic.Value>
              </Statistic>
            </Segment>
          </Grid.Column>

          <Grid.Column>
            <Segment raised>
              <Header as="h3" textAlign="center">
                Deposit Funds.
              </Header>
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
            </Segment>

            <Segment raised style={{ marginTop: "20px" }}>
              <Header as="h3" textAlign="center">
                Withdraw Funds
              </Header>
              <Form>
                <Form.Input
                  type="number"
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
            </Segment>
          </Grid.Column>
        </Grid.Row>
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
        <Grid.Row>
          <Grid.Column width={16}>
            <Segment raised style={{ overflowX: "auto", maxWidth: "100%" }}>
              <Header as="h3" textAlign="center">
                Hedge Fund Trade History.
              </Header>
              <Table celled>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>ID</Table.HeaderCell>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Amount</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {trades.map((trade) => (
                    <Table.Row key={trade.id}>
                      <Table.Cell>{trade.id}</Table.Cell>
                      <Table.Cell>{trade.type}</Table.Cell>
                      <Table.Cell>${trade.amount.toFixed(2)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Segment>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Container>
  );
};

export default BankingHomepage;
