#import "SharedIngestModule.h"

static NSString *const kSharedIngestAppGroup = @"group.com.snapurl.app";
static NSString *const kSharedIngestPayloadKey = @"pendingSharedIngestPayload";

@implementation SharedIngestModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(consumePendingSharedUrl,
                 consumePendingSharedUrlWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:kSharedIngestAppGroup];
  if (sharedDefaults == nil) {
    resolve((id)kCFNull);
    return;
  }

  NSString *payload = [sharedDefaults stringForKey:kSharedIngestPayloadKey];
  if (payload == nil || payload.length == 0) {
    resolve((id)kCFNull);
    return;
  }

  NSData *data = [payload dataUsingEncoding:NSUTF8StringEncoding];
  if (data == nil) {
    [sharedDefaults removeObjectForKey:kSharedIngestPayloadKey];
    [sharedDefaults synchronize];
    resolve((id)kCFNull);
    return;
  }

  NSError *error = nil;
  NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
  if (error != nil || ![json isKindOfClass:[NSDictionary class]]) {
    [sharedDefaults removeObjectForKey:kSharedIngestPayloadKey];
    [sharedDefaults synchronize];
    reject(@"shared_ingest_invalid_payload", @"Failed to parse shared ingest payload", error);
    return;
  }

  NSString *url = json[@"url"];
  [sharedDefaults removeObjectForKey:kSharedIngestPayloadKey];
  [sharedDefaults synchronize];

  if (url == nil || ![url isKindOfClass:[NSString class]] || url.length == 0) {
    resolve((id)kCFNull);
    return;
  }

  resolve(url);
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
