#import "AppDelegate.h"

#import <EXDevLauncher/EXDevLauncherController.h>
#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTRootView.h>

@interface AppDelegate () <EXDevLauncherControllerDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

  EXDevLauncherController *controller = [EXDevLauncherController sharedInstance];
  [controller startWithWindow:self.window delegate:self launchOptions:launchOptions];

  return YES;
}

- (RCTBridge *)initializeReactNativeApp
{
  NSDictionary *launchOptions = [EXDevLauncherController.sharedInstance getLaunchOptions];
  self.bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:self.bridge moduleName:@"main" initialProperties:@{}];
  rootView.backgroundColor = [UIColor systemBackgroundColor];

  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  return self.bridge;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  NSURL *sourceURL = [[EXDevLauncherController sharedInstance] sourceUrl];
  if (sourceURL != nil) {
    return sourceURL;
  }
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  if ([EXDevLauncherController.sharedInstance onDeepLink:url options:options]) {
    return YES;
  }

  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

- (void)devLauncherController:(EXDevLauncherController *)developmentClientController
          didStartWithSuccess:(BOOL)success
{
  [self initializeReactNativeApp];
  developmentClientController.appBridge = self.bridge.batchedBridge;
}

- (BOOL)isReactInstanceValid
{
  return self.bridge != nil && self.bridge.valid;
}

- (void)destroyReactInstance
{
  [self.bridge invalidate];
  self.bridge = nil;
}

@end
