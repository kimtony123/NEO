import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import {
  Button,
  Container,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  List,
  Menu,
  Segment,
  Sidebar,
  MenuMenu,
  MenuItem,
  GridColumn,
  GridRow,
  FormField,
  Form,
  Checkbox,
  FormGroup,
  FormInput,
  FormButton,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableFooter,
} from "semantic-ui-react";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

function Navbar() {
  const [address, setAddress] = useState("");

  const fetchAddress = async () => {
    await window.arweaveWallet.connect(permissions, {
      name: "Notus",
      logo: "OVJ2EyD3dKFctzANd0KX_PCgg8IQvk0zYqkWIj-aeaU",
    });
    try {
      const address = await window.arweaveWallet.getActiveAddress();
      setAddress(address);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container>
      <Header as="h2" dividing>
        Notus.
      </Header>

      <Grid columns={1} doubling>
        <Grid.Column>
          <Menu>
            <Button icon="heart" color="green" />
            <Button color="green"> Notus Options </Button>

            <MenuMenu position="right">
              {address ? (
                <p>
                  <span className="md:hidden">{`${address.slice(
                    0,
                    5
                  )}...${address.slice(-3)}`}</span>
                  <span className="hidden sm:hidden md:block">{address}</span>
                </p>
              ) : (
                <Button onClick={fetchAddress} primary>
                  Connect Wallet.
                </Button>
              )}
            </MenuMenu>
          </Menu>
        </Grid.Column>
      </Grid>
    </Container>
  );
}

export default Navbar;
