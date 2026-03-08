import { NativeModules, Platform } from "react-native";

type SharedIngestModuleShape = {
  consumePendingSharedUrl(): Promise<string | null>;
};

const nativeModule = NativeModules.SharedIngestModule as SharedIngestModuleShape | undefined;

export async function consumePendingSharedUrl() {
  if (Platform.OS !== "ios" || !nativeModule) {
    return null;
  }

  const sharedUrl = await nativeModule.consumePendingSharedUrl();
  return sharedUrl || null;
}
