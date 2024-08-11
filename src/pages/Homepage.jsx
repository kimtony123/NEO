import React from "react";
import {
  BrowserRouter,
  Route,
  Router,
  Routes,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  GridColumn,
  Grid,
  Container,
  CardMeta,
  CardHeader,
  CardDescription,
  CardContent,
  Card,
  Icon,
  Image,
  Header,
  List,
  Divider,
  Menu,
  MenuItem,
  MenuHeader,
  Button,
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
    <Container>
      <Divider />
      <Grid columns={3} padded="horizontally">
        <GridColumn>
          <Card>
            <Image src="sunsethome.png" wrapped ui={false} />
            <CardContent>
              <CardHeader>AO-ClimaOptions.</CardHeader>
              <CardMeta>Climate Binary Options Trading platform</CardMeta>
              <CardDescription>
                Buy Temperature based binary options.
              </CardDescription>
            </CardContent>
            <CardContent position="center" extra>
              <a>
                <Icon name="money" />
                <Button primary onClick={handleClickAoHomeOne}>
                  Trade
                </Button>
              </a>
            </CardContent>
          </Card>
        </GridColumn>
        <GridColumn>
          <Card>
            <Image src="NEO HedgeFund.jpg" wrapped ui={false} />
            <CardContent>
              <CardHeader>NEO Decentralized Hedge Fund</CardHeader>
              <CardMeta> Accrued Returns </CardMeta>
              <CardDescription>
                The First Decentralized Hedge Fund.
              </CardDescription>
            </CardContent>
            <CardContent extra>
              <a>
                <Icon name="money" />
              </a>
              <Button primary onClick={neoHedgeFund}>
                Invest.
              </Button>
            </CardContent>
          </Card>
        </GridColumn>
        <GridColumn>
          <Card>
            <Image src="morpheus.png" wrapped ui={false} />
            <CardContent>
              <CardHeader>Notus Crypto Trading platform</CardHeader>
              <CardMeta>Buy crypto binary options</CardMeta>
              <CardDescription>
                Buy binary options of your favorite crypto currencies .
              </CardDescription>
            </CardContent>
            <CardContent extra>
              <a>
                <Icon name="money" />
              </a>
              <Button primary onClick={handleClickBinary}>
                Trade.
              </Button>
            </CardContent>
          </Card>
        </GridColumn>
      </Grid>
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

export default HomePage;
