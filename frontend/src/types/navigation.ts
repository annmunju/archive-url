import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  DocumentDetail: {
    documentId: number;
  };
  EditDocument: {
    documentId: number;
  };
};

export type TabParamList = {
  Home: undefined;
  Documents:
    | {
        refreshToken?: number;
        refreshDelayMs?: number;
      }
    | undefined;
};
