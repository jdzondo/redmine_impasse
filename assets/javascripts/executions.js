jQuery.noConflict();

jQuery(document).ready(function ($) {
    var bind_node_event = function(e, data) {
	$("#testplan-tree").unblock();
	$(this).find("li[rel=test_case]").click(function(e) {
	    var $node = $(this);
	    $("#executions-view").block(impasse_loading_options());
	    $.ajax({
		url: IMPASSE.url.executionsEdit,
		data: {
		    "test_plan_case[test_plan_id]": test_plan_id,
		    "test_plan_case[test_case_id]": $node.attr("id").replace("exec_", "")
		},
		success: function(html) {
		    $("#executions-view").empty().append($(html))
		    $("span.label", $("#executions-view"))
			.css({cursor:'pointer'})
			.click(function(e) {
			    $(this).prev().attr("checked", "checked");
			});
		},
		error: ajax_error_handler,
		complete: function() { $("#executions-view").unblock(); }
	    });
	});
    };

    var $tree = $("#testplan-tree")
	.bind("loaded.jstree", bind_node_event)
	.bind("refresh.jstree", bind_node_event)
	.jstree({ 
	    "plugins" : [
		"themes","json_data","ui","crrm","search","types","hotkeys"
	    ],
	    json_data : { 
		ajax : {
		    url : IMPASSE.url.executionsList,
		    data : function (n) { 
			var params = { 
			    prefix: "exec",
			    id : n.attr ? n.attr("id").replace("exec_","") : -1
			};
			if ($("#filters #cb_myself").is(":checked")) {
			    params["myself"] = true;
			}
			params["execution_status"] = $("#filters :checkbox[name=execution_status]:checked").map(function() {
			    return $(this).val();
			}).get();
			return params;
		    }
		}
	    },
	    types: {
		max_depth: -2,
		max_children: -2,
		valid_children: [ "test_project" ],
		types: {
		    test_case: {
			valid_children: "none",
			icon: { image: IMPASSE.url.iconTestCase }
		    },
		    test_suite: {
			valid_children: [ "test_suite", "test_case" ],
			icon: { image: IMPASSE.url.iconTestSuite }
		    },
		    test_project: {
			valid_children: [ "test_suite", "test_case" ],
			icon: { image: IMPASSE.url.iconProject },
			start_drag: false,
			move_node: false,
			delete_node: false,
			remove: false
		    }
		}
	    }
	});

    $("p.buttons a.icon.icon-checked").click(function(e) {
	$tree.jstree("refresh", -1);
	$("#testplan-tree").block(impasse_loading_options());
	return false;
    });
    $("#executions-view form").live("submit", function(e) {
	var $this = $(this);
	var post_save_function = function() {};
	var execution_status = $this.find(":radio[name='execution[status]']:checked").val();
	if(execution_status == "2") { // NG
	    post_save_function = function() {
		$.get(IMPASSE.url.executionBugsNew, {},
			function(data) {
			    $("#issue-dialog").empty().append(data).dialog({
				modal:true,
				minWidth: 800,
				title: IMPASSE.label.issueNew
			    });
			});
	    };
	}
	$.ajax({
	    url: IMPASSE.url.executionsPut,
	    type: 'POST',
	    data: $this.serialize() + "&format=json",
	    success: function(data) {
		$("#executions-view .flash").remove();
		$("#executions-view").prepend(
		    $("<div/>").addClass("flash").addClass("notice")
			.text(IMPASSE.label.noticeSuccessfulUpdate));
		post_save_function();
		var test_case_id = $(":hidden[name='test_plan_case[test_case_id]']" ,$this).val();
		$("#testplan-tree li#exec_"+test_case_id+" a  ins").css({backgroundImage: "url("+EXEC_ICONS[execution_status]+")"});
	    },
	    error: function(data) {
		$("#executions-view .flash").remove();
		$("#executions-view").prepend(
		    $("<div/>").addClass("flash").addClass("error")
			.text("Save failure."));
	    }
	});
	return false;
    });

    $("#issue-dialog form").live("submit", function(e) {
	var $this = $(this);
	$.ajax({
	    url: IMPASSE.url.executionBugsCreate,
	    type: 'POST',
	    data: $this.serialize()
		+ "&execution_bug[execution_id]="+ $("#executions-view :hidden#execution_id").val()
		+"&format=json",
	    success: function(data) {
	    },
	    complete: function() {
		$("#issue-dialog").dialog("close");
	    }
	});
	return false;
    })
});
