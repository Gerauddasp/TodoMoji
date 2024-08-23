#!/bin/bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.geraudd.things-emojis.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.geraudd.things-emojis.plist
launchctl list | grep com.geraudd.things-emojis