{
	"patcher" : 	{
		"fileversion" : 1,
		"appversion" : 		{
			"major" : 9,
			"minor" : 0,
			"revision" : 0,
			"architecture" : "x64",
			"modernui" : 1
		}
,
		"classnamespace" : "box",
		"rect" : [ 100.0, 100.0, 640.0, 480.0 ],
		"gridsize" : [ 15.0, 15.0 ],
		"boxes" : [ 			{
				"box" : 				{
					"id" : "obj-1",
					"maxclass" : "newobj",
					"numinlets" : 0,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 100.0, 100.0, 150.0, 22.0 ],
					"text" : "maxmcp.server"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-6",
					"maxclass" : "newobj",
					"numinlets" : 0,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 300.0, 100.0, 150.0, 22.0 ],
					"text" : "maxmcp.server"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-2",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 100.0, 50.0, 400.0, 20.0 ],
					"text" : "MaxMCP Server Singleton Test",
					"textcolor" : [ 0.0, 0.0, 0.0, 1.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-3",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 100.0, 150.0, 500.0, 60.0 ],
					"text" : "This patch creates TWO maxmcp.server objects to test singleton behavior.\nThe second instance should fail with an error message:\n\"maxmcp.server already exists! Only one instance allowed\"",
					"textcolor" : [ 0.0, 0.0, 0.0, 1.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-4",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 100.0, 230.0, 500.0, 60.0 ],
					"text" : "Expected Console Output:\n- MaxMCP Server external loaded\n- MaxMCP Server initialized (singleton)  ← First instance succeeds\n- MaxMCP Server started with stdio communication\n- maxmcp.server already exists! Only one instance allowed  ← Second instance fails",
					"textcolor" : [ 0.0, 0.0, 0.0, 1.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-5",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 100.0, 310.0, 500.0, 20.0 ],
					"text" : "If both objects load successfully, the singleton pattern is NOT working correctly.",
					"textcolor" : [ 1.0, 0.0, 0.0, 1.0 ]
				}

			}
 ],
		"lines" : [  ],
		"dependency_cache" : [ 			{
				"name" : "maxmcp.server.mxo",
				"type" : "iLaX"
			}
 ],
		"autosave" : 0
	}

}
