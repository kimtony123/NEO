import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import {
  Button,
  Container,
  Grid,
  Header,
  Menu,
  MenuMenu,
} from "semantic-ui-react";

const permissions: PermissionType[] = [
  "ACCESS_ADDRESS",
  "SIGNATURE",
  "SIGN_TRANSACTION",
  "DISPATCH",
];

function Navbar() {
  const [address, setAddress] = useState("");

  useEffect(() => {
    // Retrieve address from localStorage when component mounts
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      setAddress(storedAddress);
    }
  }, []);

  const fetchAddress = async () => {
    await window.arweaveWallet.connect(permissions, {
      name: "Notus",
      logo: "OVJ2EyD3dKFctzANd0KX_PCgg8IQvk0zYqkWIj-aeaU",
    });
    try {
      const address = await window.arweaveWallet.getActiveAddress();
      setAddress(address);
      // Store address in localStorage
      localStorage.setItem("walletAddress", address);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container>
      <Grid columns={1} doubling>
        <Grid.Column>
          <Menu>
            <Button icon="sun" color="green" />
            <Button src="/" color="green">
              Home.
            </Button>

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
