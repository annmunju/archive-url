import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Processing: {
    jobId: number;
    normalizedUrl: string | null;
  };
  DocumentDetail: {
    documentId: number;
  };
  EditDocument: {
    documentId: number;
  };
};

export type TabParamList = {
  Home: undefined;
  Documents: undefined;
};
