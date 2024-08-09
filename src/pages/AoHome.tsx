import React from "react";
import {
  Button,
  Container,
  Divider,
  Grid,
  Image,
  Segment,
  Sidebar,
  MenuMenu,
  MenuItem,
  GridColumn,
  Form,
  Menu,
  FormGroup,
  FormInput,
  FormButton,
} from "semantic-ui-react";
import useAxio from "../hooks/useAxio";

import { useEffect, useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";

interface WeatherDataProps {
  name: string;

  main: {
    temp: number;
    humidity: number;
  };
  sys: {
    country: string;
  };
  weather: {
    main: string;
  }[];
  wind: {
    speed: number;
  };
}

interface Tag {
  name: string;
  value: string;
}

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

const api_key = "a2f4db644e9107746535b0d2ca43b85d";
const api_Endpoint = "https://api.openweathermap.org/data/2.5/";

const AOC = "pdKYJSk3n2XuFSt6AX-A7n_DhMmTWxCH3W8dxGBPXjM";

function AoHome(this: any) {
  const { response } = useAxio();

  const [address, setAddress] = useState("");
  const [aocBalance, setAocBalance] = useState(0);

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

  console.log(response);

  if (!response) {
    return <h4>loading</h4>;
  }

  return (
    <Container>
      <Divider />
      <Menu pointing secondary>
        <MenuItem>
          <Form>
            <FormGroup>
              <FormInput size="mini" placeholder="Amount" />
              <FormButton secondary size="mini" content="Unstake." />
            </FormGroup>
          </Form>
        </MenuItem>
        <MenuMenu position="right">
          <MenuItem>
            <Form>
              <FormGroup>
                <FormInput size="mini" placeholder="Amount" />
                <FormButton size="mini" primary content="Stake." />
              </FormGroup>
            </Form>
          </MenuItem>
          <MenuItem>
            <Button onClick={claim} size="mini" primary>
              Claim AOC
            </Button>
          </MenuItem>
        </MenuMenu>
      </Menu>
      <Divider />
      AOC Balance: <span className="font-bold">{aocBalance}</span>
      <Divider />
      Staked Balance: <span className="font-bold">{aocBalance}</span>
      <Divider />
      <Grid columns="equal">
        <GridColumn>
          <Form size="large">
            <Segment stacked>
              <Image src="sunset.png" wrapped ui={false} />
              <Divider />
              <span>Country : {response.sys.country}</span>
              <Divider />
              <span>CountryId : {response.sys.id}</span>
              <Divider />
              <span>City : {response.name}</span>
              <Divider />

              <span> Current Temp : {response.main.temp}</span>
              <Divider />
              <span>Current Time : {response.dt}</span>
              <Divider />
              <Form.Input
                fluid
                icon="money"
                iconPosition="left"
                placeholder="Amount of AOC."
              />
              <Divider />
              <Button color="teal" position="left" fluid size="small">
                Call.
              </Button>
            </Segment>
          </Form>
        </GridColumn>
        <GridColumn>
          <Form size="large">
            <Segment stacked>
              <Image src="sunset.png" wrapped ui={false} />
              <Divider />
              <span>Country : {response.sys.country}</span>
              <Divider />
              <span>CountryId : {response.sys.id}</span>
              <Divider />
              <span>City : {response.name}</span>
              <Divider />

              <span> Current Temp : {response.main.temp}</span>
              <Divider />
              <span>Current Time : {response.dt}</span>
              <Divider />
              <Form.Input
                fluid
                icon="money"
                iconPosition="left"
                placeholder="Amount of AOC"
              />
              <Divider />
              <Button color="red" position="right" fluid size="small">
                Put.
              </Button>
            </Segment>
          </Form>
        </GridColumn>
      </Grid>
    </Container>
  );
}

export default AoHome;
