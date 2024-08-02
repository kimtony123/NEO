import React from "react";
import { useNavigate } from "react-router-dom";
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
import "./../homepage.css"; // Import the custom CSS

const HomePage = () => {
  const navigate = useNavigate();

  const handleClickBinary = () => {
    navigate("/CryptoHome");
  };

  return (
    <Container className="homepage-container">
      <Divider />
      <Header as="h1" textAlign="center" className="homepage-header">
        Notus Exchange Options
      </Header>
      <Grid centered>
        <GridColumn width={8}>
          <Card fluid className="homepage-card">
            <Image
              src="morpheus-blue.png"
              wrapped
              ui={false}
              className="homepage-image"
            />
            <CardContent>
              <CardHeader className="homepage-card-header">
                Notus Crypto Trading Platform
              </CardHeader>
              <CardMeta className="homepage-card-meta">
                Buy crypto binary options
              </CardMeta>
              <CardDescription className="homepage-card-description">
                Buy binary options of your favorite crypto currencies.
              </CardDescription>
            </CardContent>
            <CardContent extra>
              <Icon name="money" />
              <Button
                primary
                onClick={handleClickBinary}
                className="homepage-button"
              >
                Trade
              </Button>
            </CardContent>
          </Card>
        </GridColumn>
      </Grid>
      <Divider />
      <Menu inverted className="homepage-menu">
        <MenuItem
          href="https://notus-memeframe.vercel.app/"
          header
          className="homepage-menu-item"
        >
          Notus DAO
        </MenuItem>
        <MenuItem className="homepage-menu-item">
          <Button
            href="https://x.com/NotusOptions"
            content="Twitter"
            icon="twitter"
            labelPosition="right"
            className="homepage-button"
          />
        </MenuItem>
        <MenuItem position="right" className="homepage-menu-item">
          <Button
            href="https://github.com/kimtony123/notus-trading-app"
            content="Github"
            icon="github"
            labelPosition="left"
            className="homepage-button"
          />
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default HomePage;
