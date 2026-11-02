#!/usr/bin/env python3
"""Patch the MrPurple666/pvzge-android v0.16.1 Android wrapper.

This deliberately does not change compiled PvZ2 Gardendless game assets.
Native Cocos touch events remain enabled; a separate ordered mouse stream is
synthesized for desktop-only controls across scenes. There is no new shovel UI.
"""
from pathlib import Path
import shutil, sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
source = Path(__file__).resolve().parent

def rep(relpath, old, new):
    path = root / relpath
    s = path.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'PATCH REFUSED: {relpath}, expected 1 match but found {count}: {old[:90]!r}')
    path.write_text(s.replace(old, new, 1), encoding='utf-8')

webview = root / 'app/src/main/java/com/pvzge/gardendless/MouseGameWebView.kt'
old = webview.read_text(encoding='utf-8')
if 'class MouseGameWebView' not in old or 'injectJsMouseEvent' not in old:
    raise SystemExit('Unexpected native mouse adapter: must be the original v0.16.1 source')
webview.write_text('''// PvZ2 Gardendless Android v0.5.3 experimental native-touch wrapper.
// Keeps Cocos/WebView touch events intact; ge-mobile-input.js supplies
// an ordered, compatible mouse stream for the game lawn controls.
// Based on the GPL-3.0 Android port.
package com.pvzge.gardendless

import android.content.Context
import android.util.AttributeSet
import android.webkit.WebView

class MouseGameWebView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : WebView(context, attrs)
''', encoding='utf-8')

activity = 'app/src/main/java/com/pvzge/gardendless/GameActivity.kt'
rep(activity, '    private lateinit var performanceScript: String',
    '    private lateinit var performanceScript: String\n    private lateinit var mobileTouchScript: String')
rep(activity,
    '        performanceScript = assets.open("android-performance.js").bufferedReader().use { it.readText() }',
    '        performanceScript = assets.open("android-performance.js").bufferedReader().use { it.readText() }\n'
    '        mobileTouchScript = assets.open("ge-mobile-input.js").bufferedReader().use { it.readText() }')
rep(activity,
    'performanceScript + gameBridgeHookJs + "</script>"',
    'performanceScript + gameBridgeHookJs + mobileTouchScript + "</script>"')
# Original script actively stops touchstart/move/end propagation at capture phase.
# This is what prevents the game's original Cocos shovel button from seeing touch.
rep(activity, 'val modified = hookedHtml.replace("</body>", tag)', 'val modified = hookedHtml')

# Keep the original native fullscreen architecture (same WebView) without handing
# WebView a detached HTML5 fullscreen surface, whose missing mounting can freeze.
rep(activity, '''            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (fullscreenCallback != null) {
                    callback.onCustomViewHidden()
                    return
                }
                fullscreenCallback = callback
                setWebviewFullscreen(true)
            }

            override fun onHideCustomView() {
                val callback = fullscreenCallback ?: return
                fullscreenCallback = null
                callback.onCustomViewHidden()
                setWebviewFullscreen(false)
            }''', '''            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                // Reject the detached HTML5 custom view; use our own container.
                callback.onCustomViewHidden()
                setWebviewFullscreen(true)
            }

            override fun onHideCustomView() {
                setWebviewFullscreen(false)
            }''')
rep(activity, '''    var req = ep.requestFullscreen || ep.webkitRequestFullscreen || ep.webkitRequestFullScreen;
    if (req) {
        ep.requestFullscreen = function() { setFullscreen(true); return req.apply(this, arguments); };
    }
    var dp = Document.prototype;
    var exit = dp.exitFullscreen || dp.webkitExitFullscreen || dp.webkitCancelFullScreen;
    if (exit) {
        dp.exitFullscreen = function() { setFullscreen(false); return exit.apply(this, arguments); };
    }''', '''    // Cocos uses our stable WebView container; do not enter HTML5 custom view.
    var req = ep.requestFullscreen || ep.webkitRequestFullscreen || ep.webkitRequestFullScreen;
    if (req) {
        ep.requestFullscreen = function() { setFullscreen(true); return Promise.resolve(); };
        if (ep.webkitRequestFullscreen) ep.webkitRequestFullscreen = ep.requestFullscreen;
        if (ep.webkitRequestFullScreen) ep.webkitRequestFullScreen = ep.requestFullscreen;
    }
    var dp = Document.prototype;
    var exit = dp.exitFullscreen || dp.webkitExitFullscreen || dp.webkitCancelFullScreen;
    if (exit) {
        dp.exitFullscreen = function() { setFullscreen(false); return Promise.resolve(); };
        if (dp.webkitExitFullscreen) dp.webkitExitFullscreen = dp.exitFullscreen;
        if (dp.webkitCancelFullScreen) dp.webkitCancelFullScreen = dp.exitFullscreen;
    }''')

aspect = 'app/src/main/java/com/pvzge/gardendless/AspectRatioFrameLayout.kt'
rep(aspect, '''        if (!fullscreen) {
            when {
                screenWidth * MAX_ASPECT_H > screenHeight * MAX_ASPECT_W -> {
                    targetWidth = screenHeight * MAX_ASPECT_W / MAX_ASPECT_H
                }
                screenWidth * MIN_ASPECT_H < screenHeight * MIN_ASPECT_W -> {
                    targetHeight = screenWidth * MIN_ASPECT_H / MIN_ASPECT_W
                }

            }
        }''', '''        // Stable aspect and render dimensions in both normal and fullscreen.
        // Edge-to-edge stretch would distort zombies and lawn tile geometry.
        when {
            screenWidth * MAX_ASPECT_H > screenHeight * MAX_ASPECT_W -> {
                targetWidth = screenHeight * MAX_ASPECT_W / MAX_ASPECT_H
            }
            screenWidth * MIN_ASPECT_H < screenHeight * MIN_ASPECT_W -> {
                targetHeight = screenWidth * MIN_ASPECT_H / MIN_ASPECT_W
            }
        }''')
rep(aspect, '''        child.scaleX = if (renderSize[0] > 0) targetWidth.toFloat() / renderSize[0] else 1f
        child.scaleY = if (renderSize[1] > 0) targetHeight.toFloat() / renderSize[1] else 1f''', '''        val uniformScale = if (renderSize[0] > 0 && renderSize[1] > 0) {
            minOf(targetWidth.toFloat() / renderSize[0], targetHeight.toFloat() / renderSize[1])
        } else 1f
        child.scaleX = uniformScale
        child.scaleY = uniformScale''')

rep('app/build.gradle.kts', '''    buildTypes {
        release {''', '''    buildTypes {
        debug {
            // Install alongside the user's existing v0.16.1 and v0.4 APKs.
            applicationIdSuffix = ".nativev053"
        }
        release {''')
rep('app/src/main/AndroidManifest.xml', 'android:label="@string/app_name"',
    'android:label="GE 全场景触控测试 v0.5.3"')
asset = root / 'app/src/main/assets/ge-mobile-input.js'
asset.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source / 'ge-mobile-input.js', asset)

assert 'stopImmediatePropagation' not in webview.read_text()
assert 'installMobileShovelButton' not in (root / activity).read_text()
assert 'applicationIdSuffix = ".nativev053"' in (root / 'app/build.gradle.kts').read_text()
assert 'child.scaleX = uniformScale' in (root / aspect).read_text()
print('Applied v0.5.3: real Cocos touches preserved, state-aware cross-scene mouse events, no right-click shovel overlay, uniform scaling.')
