import { NativeModules, Platform } from "react-native";

type SharedIngestModuleShape = {
  consumePendingSharedUrl(): Promise<{ url: string; note?: string } | null>;
};

const nativeModule = NativeModules.SharedIngestModule as SharedIngestModuleShape | undefined;

export async function consumePendingSharedUrl() {
  if (Platform.OS !== "ios" || !nativeModule) {
    return null;
  }

  const sharedPayload = await nativeModule.consumePendingSharedUrl();
  return sharedPayload || null;
}
