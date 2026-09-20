import type { CreateSplitForm } from "./types";

export const EMPTY_CREATE_FORM: CreateSplitForm = {
  title: "",
  totalAmount: "",
  splitMethod: "equal",
  selectedFriendIds: [],
  shares: [],
};

export const SPLIT_METHODS = ["equal", "exact"] as const;
