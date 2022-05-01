import { Timer } from "../lib/timer";

export type Timers = {
  [contract: string]: Timer;
};

export type Collection = {
  id: number;
  name: string;
  contract_id: string;
};

export type CollectionItem = {
  token_id: string;
};

export type Store = {
  [contract: string]: {
    createdAt: string;
    lastBidIndex: number;
    items: CollectionItem[];
  };
};

export type Bid = {
  amount: string;
  tokenId: string;
  contract: string;
  expirationTime?: number;
};
