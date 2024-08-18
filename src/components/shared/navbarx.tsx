import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  Button,
  Container,
  Grid,
  Header,
  Menu,
  MenuMenu,
  Image,
} from "semantic-ui-react";
import { connect, disconnect } from "@othent/kms";
import { PermissionType } from "arconnect";

function Navbar() {
  const [address, setAddress] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const handleConnect = async () => {
    try {
      const res = await connect();
      console.log("Connect,\n", res);

      // Store the wallet address and profile picture in the state
      setAddress(res.walletAddress);
      setProfilePic(res.picture);

      // Store in localStorage for persistence
      localStorage.setItem("walletAddress", res.walletAddress);
      localStorage.setItem("profilePic", res.picture);
    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setAddress("");
      setProfilePic("");
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("profilePic");
    } catch (error) {
      console.error("Disconnection failed", error);
    }
  };

  useEffect(() => {
    // Retrieve address and profilePic from localStorage when component mounts
    const storedAddress = localStorage.getItem("walletAddress");
    const storedProfilePic = localStorage.getItem("profilePic");

    if (storedAddress) {
      setAddress(storedAddress);
    }

    if (storedProfilePic) {
      setProfilePic(storedProfilePic);
    }
  }, []);

  return (
    <Container>
      <Grid columns={1} doubling>
        <Grid.Column>
          <Menu>
            <Button icon="sun" color="green" />
            <Button src="/" color="green">
              Home
            </Button>

            <MenuMenu position="right">
              {address && profilePic ? (
                <>
                  <span style={{ marginRight: "1em" }}>{address}</span>
                  <Image
                    src={profilePic}
                    avatar
                    style={{ marginRight: "1em" }}
                  />
                  <Button onClick={handleDisconnect} color="red">
                    Sign Out.
                  </Button>
                </>
              ) : (
                <Button onClick={handleConnect} primary>
                  Sign In
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
