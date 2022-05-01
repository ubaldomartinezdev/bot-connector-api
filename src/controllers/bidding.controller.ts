import axios, { AxiosError, AxiosResponse } from "axios";
import { Request, Response, Router } from "express";
import { get, set } from "lodash";

import { store } from "../lib/store";
import { Timer } from "../lib/timer";
import { Bid, CollectionItem, Timers } from "../models";

const router = Router();

const timers: Timers = {};

const getCollectionItems = (contract: string, label: string) =>
  axios
    .get(`${process.env.DB_CONNECTOR_URL}/collections/${contract}/${label}`)
    .then(
      ({ data }: AxiosResponse<CollectionItem[]>) => data,
      (error: AxiosError) => {
        console.error(error.message);
        throw error;
      }
    );

const bid = async ({
  label,
  bidIndex,
  contract,
  collection,
}: {
  label: string;
  contract: string;
  bidIndex: number;
  collection: CollectionItem[];
}) => {
  const contractWithLabel = `${contract}_${label}`;

  if (bidIndex >= collection.length) {
    console.log("--END_OF_COLLECTION--");
    get(timers, contractWithLabel).stop();
    store.del(contractWithLabel).then(() => startBidding(contract, label));
    return;
  }

  const tokenId = collection[bidIndex].token_id;
  const bidPrice = await axios
    .get(`${process.env.DB_CONNECTOR_URL}/prices/${contract}/bid`)
    .then(
      ({ data }) => data[0].bid_price,
      (error) => console.error(error.message)
    );

  if (bidPrice) {
    console.log("BID_PLACING", contract, tokenId, bidPrice);
    await axios
      .post<Bid>(
        `${process.env.BOT_URL}/bid`,
        {
          tokenId,
          contract,
          amount: bidPrice,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      )
      .then(
        () => {
          console.log("BID_PLACED", contract, tokenId, bidPrice);
          store.put(contractWithLabel, ++bidIndex);
        },
        (error: AxiosError) => {
          const errorMessage = error.response?.data;
          const regexp = /insufficient|balance/gi;
          if (regexp.test(errorMessage)) {
            console.log("STOP_BIDDING. Reason:", errorMessage);
            get(timers, contractWithLabel).stop();
          }
          console.error(error.response?.data);
        }
      );
  }
};

const startBidding = async (contract: string, label: string) => {
  const contractWithLabel = `${contract}_${label}`;

  const collection = await getCollectionItems(contract, label);

  const currentBidIndex = await store.get(contractWithLabel).then(
    (bidIndex) => bidIndex,
    (error) => {
      console.error(error.message);
      return 0;
    }
  );

  store.put(contractWithLabel, currentBidIndex).then(() => {
    set(
      timers,
      contractWithLabel,
      new Timer(async () =>
        bid({
          label,
          contract,
          collection,
          bidIndex: Number(await store.get(contractWithLabel)),
        })
      )
    );
    get(timers, contractWithLabel).start();
  });
};

router.get(
  "/:contract/:label/start",
  (req: Request<{ contract: string; label: string }>, res: Response) => {
    const { contract, label } = req.params;
    startBidding(contract, label);
    res.status(200).send();
  }
);

router.get(
  "/:contract/:label/pause",
  async (req: Request<{ contract: string; label: string }>, res: Response) => {
    const { contract, label } = req.params;

    const contractWithLabel = `${contract}_${label}`;
    get(timers, contractWithLabel).stop();
    res.status(200).send();
  }
);

router.get(
  "/:contract/:label/resume",
  async (req: Request<{ contract: string; label: string }>, res: Response) => {
    const { contract, label } = req.params;

    const contractWithLabel = `${contract}_${label}`;
    get(timers, contractWithLabel).start();
    res.status(200).send();
  }
);

router.get(
  "/:contract/:label/clear",
  async (req: Request<{ contract: string; label: string }>, res: Response) => {
    const { contract, label } = req.params;

    const contractWithLabel = `${contract}_${label}`;
    get(timers, contractWithLabel).stop();

    store.del(contractWithLabel).then(
      () => res.status(200).send(),
      (error) => res.status(500).send(error.message)
    );
  }
);

export { router as bidding };
