import { useParams } from "react-router-dom";
import useAxios from "../hooks/useAxios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import moment from "moment";
import Skeleton from "./Skeleton";
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from "arconnect";
import { useEffect, useState } from "react";
import { Button, Container, Divider, Menu, MenuMenu } from "semantic-ui-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const HistoryChart = () => {
  const { id } = useParams();
  const [address, setAddress] = useState("");
  const { response } = useAxios(
    `coins/${id}/market_chart?vs_currency=usd&days=1`
  );
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
  const permissions: PermissionType[] = [
    "ACCESS_ADDRESS",
    "SIGNATURE",
    "SIGN_TRANSACTION",
    "DISPATCH",
  ];

  if (!response) {
    return (
      <div className="wrapper-container mt-8">
        <Skeleton className="h-72 w-full mb-10" />
      </div>
    );
  }
  const coinChartData = response.prices.map((value: number[]) => ({
    x: value[0],
    y: value[1].toFixed(2),
  }));

  const options = {
    responsive: true,
  };
  const data = {
    labels: coinChartData.map((value: { x: moment.MomentInput }) =>
      moment(value.x).format(" DD hh:mm")
    ),
    datasets: [
      {
        fill: true,
        label: id,
        data: coinChartData.map((val: { y: any }) => val.y),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  return (
    <Container>
      <Menu>
        <Button icon="heart" color="green" />
        <Button href="/" color="green">
          {" "}
          Notus Options{" "}
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
      <div>
        <Line options={options} data={data} />
      </div>
      <Divider />
    </Container>
  );
};

export default HistoryChart;
