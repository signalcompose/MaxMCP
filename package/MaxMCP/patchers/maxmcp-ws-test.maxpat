{
	"patcher": {
		"fileversion": 1,
		"appversion": {
			"major": 9,
			"minor": 0,
			"revision": 0,
			"architecture": "x64",
			"modernui": 1
		},
		"classnamespace": "box",
		"rect": [100.0, 100.0, 640.0, 480.0],
		"bglocked": 0,
		"openinpresentation": 0,
		"default_fontsize": 12.0,
		"default_fontface": 0,
		"default_fontname": "Arial",
		"gridonopen": 1,
		"gridsize": [15.0, 15.0],
		"gridsnaponopen": 1,
		"objectsnaponopen": 1,
		"statusbarvisible": 2,
		"toolbarvisible": 1,
		"lefttoolbarpinned": 0,
		"toptoolbarpinned": 0,
		"righttoolbarpinned": 0,
		"bottomtoolbarpinned": 0,
		"toolbars_unpinned_last_save": 0,
		"tallnewobj": 0,
		"boxanimatetime": 200,
		"enablehscroll": 1,
		"enablevscroll": 1,
		"boxes": [
			{
				"box": {
					"maxclass": "comment",
					"text": "MaxMCP WebSocket Server Test",
					"fontsize": 14.0,
					"patching_rect": [30.0, 30.0, 300.0, 22.0],
					"id": "obj-1"
				}
			},
			{
				"box": {
					"maxclass": "comment",
					"text": "WebSocket server will start automatically on port 7400",
					"linecount": 2,
					"fontsize": 11.0,
					"patching_rect": [30.0, 60.0, 350.0, 31.0],
					"id": "obj-2"
				}
			},
			{
				"box": {
					"maxclass": "newobj",
					"text": "maxmcp.server @port 7400",
					"fontsize": 12.0,
					"patching_rect": [30.0, 110.0, 160.0, 22.0],
					"id": "obj-3",
					"outlettype": [""]
				}
			},
			{
				"box": {
					"maxclass": "comment",
					"text": "Check Max console for \"WebSocket server listening on localhost:7400\"",
					"linecount": 2,
					"fontsize": 10.0,
					"patching_rect": [30.0, 145.0, 300.0, 29.0],
					"id": "obj-4"
				}
			}
		],
		"lines": []
	}
}