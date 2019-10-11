$(function() {
    var p1_input = $("#p1");
    var p2_input = $("#p2");

    $("#form").submit(function(event){
        var v1 = p1_input.val();
        var v2 = p2_input.val();
        var alert_classes = "alert alert-danger";
        var error = $("#error");

        if (v1 != v2) {
            error.addClass(alert_classes).html("passwords do not match!");
            event.preventDefault();
        } else {
            error.removeClass(alert_classes).html("");
        }
    });

    p2_input.keyup(function() {
        var group = $("#p1-group,#p2-group");
        var v1 = p1_input.val();
        var v2 = p2_input.val();

        if (v1 == v2) {
            group.removeClass("has-error").addClass("has-success");
        } else {
            group.removeClass("has-success").addClass("has-error");
        }
    });
});