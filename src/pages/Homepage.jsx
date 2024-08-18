import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  Container,
  Card,
  Icon,
  Image,
  Header,
  Button,
  Menu,
  Divider,
} from "semantic-ui-react";

const HomePage = () => {
  const navigate = useNavigate();

  const handleClickBinary = () => {
    navigate("/CryptoHome");
  };
  const handleClickAoHomeOne = () => {
    navigate("/AoHomeOne");
  };
  const neoHedgeFund = () => {
    navigate("/neoHedgeFund");
  };

  return (
    <div>
      <div
        style={{
          backgroundImage: "url(hero-image.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "50px",
          color: "white",
          textAlign: "center",
        }}
      >
        <Header as="h1">Welcome to Notus Exchange Options.</Header>
        <Header as="h3">
          - Bitcoin enables peer-to-peer value transfer.
          <br />
          <Divider />
          - Ethereum enables peer-to-peer value transfer through programmable
          rules (Smart Contracts).
          <br />
          <Divider />
          - Ao Computer will enable peer-to-peer transfer of both value and
          intelligence through programmable rules (Processes).
          <Divider />
          <br />- At NEO, we are creating platforms and tools that will enable
          peer-to-peer transfer of intelligence.
        </Header>
      </div>
      <Container>
        <Divider />
        <Grid columns={2} padded="horizontally">
          <Grid.Row>
            <Grid.Column>
              <Card>
                <Image
                  src="sunsethome.png"
                  wrapped
                  ui={false}
                  style={{ height: "200px", objectFit: "cover" }}
                />
                <Card.Content>
                  <Card.Header>AO-ClimaOptions.</Card.Header>
                  <Card.Meta>Climate Binary Options Trading platform</Card.Meta>
                  <Card.Description>
                    Buy Temperature based binary options.
                  </Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Button primary onClick={handleClickAoHomeOne}>
                    Trade
                  </Button>
                </Card.Content>
              </Card>
            </Grid.Column>
            <Grid.Column>
              <Card>
                <Image
                  src="weather.png"
                  wrapped
                  ui={false}
                  style={{ height: "200px", objectFit: "cover" }}
                />
                <Card.Content>
                  <Card.Header>AO Weather Agent (Dapp)</Card.Header>
                  <Card.Meta>First Intelligent Weather Dapp</Card.Meta>
                  <Card.Description>
                    Get The best Summarized weather intelligence on AO weather
                    Dapp.
                  </Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Button primary>Use (In Progress.).</Button>
                </Card.Content>
              </Card>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column>
              <Card>
                <Image src="morpheus.png" wrapped ui={false} />
                <Card.Content>
                  <Card.Header>Notus Crypto Trading platform</Card.Header>
                  <Card.Meta>Buy crypto binary options</Card.Meta>
                  <Card.Description>
                    Buy binary options of your favorite cryptocurrencies.
                  </Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Button primary onClick={handleClickBinary}>
                    Trade
                  </Button>
                </Card.Content>
              </Card>
            </Grid.Column>
            <Grid.Column>
              <Card>
                <Image src="NEO HedgeFund.jpg" wrapped ui={false} />
                <Card.Content>
                  <Card.Header>NEO Decentralized Hedge Fund</Card.Header>
                  <Card.Meta> Accrued returns : 50.258%</Card.Meta>
                  <Card.Description>
                    The First Decentralized Hedge Fund on AO-computer.
                  </Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Button primary onClick={neoHedgeFund}>
                    Invest
                  </Button>
                </Card.Content>
              </Card>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Divider />
        <Menu>
          <Menu.Item href="https://notus-memeframe.vercel.app/" header>
            Notus DAO.
          </Menu.Item>
          <Menu.Item>
            <Button
              href="https://x.com/NotusOptions"
              content="Twitter"
              icon="twitter"
              labelPosition="right"
            />
          </Menu.Item>
          <Menu.Item position="right">
            <Button
              href="https://github.com/kimtony123/NEO"
              content="Github"
              icon="github"
              labelPosition="left"
            />
          </Menu.Item>
        </Menu>
      </Container>
    </div>
  );
};

export default HomePage;
