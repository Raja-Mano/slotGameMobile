import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Platform, 
  Dimensions,
  StatusBar,
  View,
  BackHandler,
  AppState,
  TouchableWithoutFeedback 
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

const WEB_URL = "https://stage.bougeegames.com/login";

const App = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const webViewRef = useRef(null);
  const currentOrientation = useRef('PORTRAIT_UP');
  const [isSlotGame, setIsSlotGame] = useState(false);

  const injectedJavaScript = `
    (function() {
      function handleVideo() {
        const videos = document.getElementsByTagName('video');
        for (let video of videos) {
          video.removeAttribute('controls');
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.style.pointerEvents = 'none';
          video.muted = true;
          video.setAttribute('x-webkit-airplay', 'deny');
          video.style.objectFit = 'cover';
          
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log('Autoplay prevented:', error);
            });
          }
        }
      }

      // Handle initial videos
      handleVideo();

      // Watch for dynamically added videos
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            handleVideo();
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Prevent default touchmove behavior
      document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'VIDEO') {
          e.preventDefault();
        }
      }, { passive: false });

      // Send URL updates to React Native
      function sendURLToReactNative() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'URL_CHANGE',
          url: window.location.href
        }));
      }

      // Watch for URL changes
      let lastUrl = window.location.href;
      sendURLToReactNative(); // Send initial URL

      new MutationObserver(() => {
        const url = window.location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          sendURLToReactNative();
        }
      }).observe(document, { subtree: true, childList: true });
    })();
  `;

  // Enable full-screen mode
  const enableFullScreen = async () => {
    StatusBar.setHidden(true);
    await NavigationBar.setVisibilityAsync('hidden'); // Hide navigation bar
    await NavigationBar.setBehaviorAsync('overlay-swipe'); // Prevent swipe from revealing the nav bar
    setIsFullScreen(true);
  };

  // Disable full-screen mode
  const disableFullScreen = async () => {
    StatusBar.setHidden(false);
    await NavigationBar.setVisibilityAsync('visible'); // Show navigation bar
    setIsFullScreen(false);
  };

  const applyFullScreenSettings = async () => {
    if (isSlotGame) {
      await enableFullScreen();
    } else {
      await disableFullScreen();
    }
  };

  useEffect(() => {
    applyFullScreenSettings();
  }, [isSlotGame]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'URL_CHANGE') {
        const isSlot = data.url.includes("slot-games") && !data.url.includes("china-street");
        setIsSlotGame(isSlot);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };


  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const updateDimensions = ({ window }) => {
      setScreenDimensions(window);
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription.remove();
  }, []);

  // Reapply full-screen mode when app resumes
  useEffect(() => {
    const appStateListener = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        applyFullScreenSettings();
      }
    });

    return () => appStateListener.remove();
  }, []);

  return (
    <SafeAreaView style={[styles.safeView, isSlotGame && styles.fullscreenSafeView]}>
      {/* Tap anywhere to enter full-screen mode */}
      {/* <TouchableWithoutFeedback onPress={enableFullScreen}> */}
        <View style={[styles.container, isSlotGame && styles.fullscreenContainer]} onPress={enableFullScreen}>
          <StatusBar 
            barStyle="light-content"
            backgroundColor="black"
            translucent={true}
            hidden={isSlotGame}
          />
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_URL }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleMessage}
            // onNavigationStateChange={(navState) => handleOrientationChange(navState.url)}
            // onLoadStart={(event) => handleOrientationChange(event.nativeEvent.url)}
            onLoadEnd={() => webViewRef.current?.injectJavaScript(injectedJavaScript)}
            scalesPageToFit={true}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            allowsFullscreenVideo={false}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
          />
        </View>
      {/* </TouchableWithoutFeedback> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeView: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullscreenSafeView: {
    paddingTop: 0, // Remove top padding in fullscreen
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  fullscreenContainer: {
    paddingTop: 0, // Remove top padding in fullscreen
  },
  webview: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default App;
