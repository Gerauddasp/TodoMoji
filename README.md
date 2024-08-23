# Scheduling

The scheduling is defined in the following plist: `~/Library/LaunchAgents/com.geraudd.things-emojis.plist`

> Loading the agent after changes

```
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.geraudd.things-emojis.plist
```

> Unloading the agent if needed

```
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.geraudd.things-emojis.plist
```

> Check if loaded

```
launchctl list | grep com.geraudd.things-emojis
```
