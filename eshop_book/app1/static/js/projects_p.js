
String.prototype.format = function() {
    var args = arguments;

    return this.replace(/{(\d+)}/g, function(m, i) {
        return typeof args[i] != 'undefined' ? args[i] : m;
    });
};

function Timer(callback, callbackData) {
    var self = this;

    self.__callback = callback;
    self.__callbackData = callbackData;
    self.__started = false;

    self.start = function(interval) {
        self.__started = true;

        var work = function __work() {
            if (self.__started) {
                setTimeout(function () {
                    self.__callback(self.__callbackData);
                    __work();
                }, interval);
            }
        };

        work();
    };

    self.stop = function () {
        self.__started = false;
    };

}

function Listener(eventType, callback) {
    this.eventType = eventType;
    this.callback = callback;
}

function EventData(eventType, data) {
    this.eventType = eventType;
    this.data = data;
}

function Model(projectID, errorHandler) {
    var self = this;

    self.__projectID = projectID;
    self.__errorHandler = errorHandler;

    self.PLATFORMS_CHANGED = 1;
    self.JOBS_CHANGED = 2;
    self.JOB_PARAMETERS_CHANGED = 3;
    self.TASKS_CHANGED = 4;
    self.TASKS_PARAMETERS_CHANGED = 5;
    self.ACTIONS_CHANGED = 6;
    self.TASK_LOG_CHANGED = 9;

    self.__modelData = {};
    self.__listeners = [];

    self.addListener = function (listener) {
        if (self.__listeners.indexOf(listener) < 0) {
            self.__listeners.push(listener);
        }
    };

    self.__changed = function (eventData) {
        self.__listeners.forEach(function (listener) {
            if (listener.eventType === eventData.eventType) {
                listener.callback(eventData['data']);
            }
        });
    };

    self.__error = function (data) {
        if (self.__errorHandler) {
            self.__errorHandler(data);
        }
    };

    self.__fetch = function(url, store, event, callback) {
        $.getJSON(url)
            .done(function(data) {
                self.__modelData[store] = data;
                self.__changed(new EventData(event, data));

                if (callback) {
                    callback();
                }
            })
            .fail(self.__error);
    };

    self.fetchPlatforms = function () {
        self.__fetch('/ajax_get_platforms/{0}/'.format(self.__projectID), 'platforms', self.PLATFORMS_CHANGED);
    };

    self.fetchJobs = function (platformID) {
        if (platformID < 0) {
            self.__modelData['jobs'] = null;
            self.__changed(new EventData(self.JOBS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_jobs/{0}/{1}/'.format(self.__projectID, platformID), 'jobs', self.JOBS_CHANGED);
    };

    self.fetchJobParameters = function (platformID, jobID, callback) {
        if (platformID < 0 || jobID < 0) {
            self.__modelData['jobParameters'] = null;
            self.__changed(new EventData(self.JOB_PARAMETERS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_job_parameters/{0}/{1}/'.format(platformID, jobID), 'jobParameters',
            self.JOB_PARAMETERS_CHANGED, callback);
    };

    self.fetchTaskPage = function (page, callback) {
        if (page === undefined || page < 1) {
            self.__modelData['tasks'] = null;
            self.__changed(new EventData(self.TASKS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_task_page/{0}/?page={1}&'.format(self.__projectID, page), 'tasks',
            self.TASKS_CHANGED, callback);
    };

    self.fetchTasks = function (count, callback) {
        if (count === undefined || count < 0) {
            self.__modelData['tasks'] = null;
            self.__changed(new EventData(self.TASKS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_tasks/{0}/?count={1}&'.format(self.__projectID, count), 'tasks',
            self.TASKS_CHANGED, callback);
    };

    self.fetchTaskParameters = function(taskID, callback) {
        if (taskID < 0) {
            self.__modelData['taskParameters'] = null;
            self.__changed(new EventData(self.TASKS_PARAMETERS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_task_parameters/{0}/'.format(taskID), 'taskParameters',
            self.TASKS_PARAMETERS_CHANGED, callback);
    };

    self.fetchActions = function (platformID, count, callback) {
        if (count === undefined || platformID < 0) {
            self.__modelData['actions'] = null;
            self.__changed(new EventData(self.ACTIONS_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_actions/{0}/?count={1}&'.format(platformID, count), 'actions',
            self.ACTIONS_CHANGED, callback);
    };

    self.fetchTaskLog = function (taskID, callback) {
        if (taskID < 0) {
            self.__modelData['taskLog'] = null;
            self.__changed(new EventData(self.TASK_LOG_CHANGED, null));
            return;
        }

        self.__fetch('/ajax_get_task_log/{0}/'.format(taskID), 'taskLog', self.TASK_LOG_CHANGED, callback);
    };

    self.setPlatformState = function (platformID, state) {
        $.post('/ajax_set_platform_state/{0}/?state={1}&'.format(platformID, state))
            .done(self.fetchPlatforms)
            .fail(self.error);
    };

    self.createTask = function (platformID, jobID, parameters, callback) {
        $.post('/ajax_create_task/{0}/{1}/'.format(platformID, jobID), parameters)
            .done(function() {
                self.fetchTasks(10, callback);
            })
            .fail(self.error);
    };
}

function View(model) {
    var self = this;

    self.model = model;

    self.PARAMETER_TYPE_INT = 'INT';
    self.PARAMETER_TYPE_REAL = 'REAL';
    self.PARAMETER_TYPE_STRING = 'STRING';
    self.PARAMETER_TYPE_TEXT = 'TEXT';
    self.PARAMETER_TYPE_BOOL = 'BOOL';
    self.PARAMETER_TYPE_RMTF = 'RMT_FILE';
    self.PARAMETER_TYPE_SELECT = 'SELECT';

    self.TASK_STATE_NEW = 'NEW';
    self.TASK_STATE_IN_QUEUE = 'IN_QUEUE';
    self.TASK_STATE_IN_POGRESS = 'IN_PROGRESS';
    self.TASK_STATE_SUCCESS = 'SUCCESS';
    self.TASK_STATE_ERROR = 'ERROR';

    self.TASK_STATE_LABEL_CLASS = {
        'NEW': 'btn-primary',
        'IN_QUEUE': 'btn-warning',
        'IN_PROGRESS': 'btn-info',
        'SUCCESS': 'btn-success',
        'ERROR': 'btn-danger'
    };

    self.platformsTable = $('#platforms-table');
    self.platformsCombo = $('#platforms-combo');
    self.jobsCombo = $('#jobs-combo');
    self.parametersForm = $('#parameters-form');
    self.parametersContainer = self.parametersForm.find('#parameters');
    self.advancedParametersButton = $('#advanced-parameters');
    self.runJobButton = $('#run-job');

    self.parametersForm.bootstrapValidator({
        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        }
    });

    self.parametersValidator = self.parametersForm.data('bootstrapValidator');
    self.taskTable = $('#task-table');
    self.historyModal = $('#history-modal');
    self.historyTable = $('#history-table');
    self.taskParametersModal = $('#task-parameters-modal');
    self.taskLogModal = $('#task-log-modal');

    self.platformsCombo.change(function () {
        self.runJobButton.addClass('disabled');
        self.jobsCombo.val(-1);
        self.model.fetchJobs($(this).val());
        self.model.fetchJobParameters(-1, -1);
    });

    self.__onJobsComboChange = function() {
        var platformID = self.platformsCombo.val();
        var jobID = $(this).val();

        self.clearJobParameters();

        if (platformID < 0 || jobID < 0) {
            return;
        }

        var refresh = $('#refresh-animation');

        refresh.removeClass('hidden');
        self.runJobButton.addClass('disabled');
        self.jobsCombo.off('change');
        self.jobsCombo.prop('disabled', true);

        self.model.fetchJobParameters(platformID, jobID, function() {
            refresh.addClass('hidden');
            self.jobsCombo.on('change', self.__onJobsComboChange);
            self.jobsCombo.prop('disabled', false);
        });
    };

    self.jobsCombo.change(self.__onJobsComboChange);

    self.runJobButton.click(function () {
        self.parametersContainer.find('.advanced-parameter').removeClass('hidden');
        self.parametersValidator.validate();

        if (!self.parametersValidator.isValid()) {
            return false;
        }

        var run = function() {
            self.model.createTask(
                self.platformsCombo.val(),
                self.jobsCombo.val(),
                self.parametersForm.serialize(),
                function () {
                    self.model.fetchJobParameters(-1, -1);
                    self.jobsCombo.val(-1);
                    self.runJobButton.addClass('disabled');
                }
            );
        };

        if (self.runJobButton.get(0)['askUser']) {
            var modal = $('#ask-user-modal');
            var yes = false;
            $('#ask-user-what').text(self.runJobButton.get(0)['jobName']);
            $('#ask-user-yes').off().click(function() { yes = true; });
            modal.off().on('hidden.bs.modal', function() {
                if (yes) {
                    run();
                } else {
                    return false;
                }
            });

            modal.modal('show');
        } else {
            run();
        }
    });

    self.advancedParametersButton.click(function () {
        self.parametersContainer.find('.advanced-parameter').toggleClass('hidden');
    });

    $('#more-actions').click(function () {
        var count = self.historyTable.get(0).childElementCount;
        var platformID = self.historyModal.get(0)['platformID'];
        self.model.fetchActions(platformID, count + 10);
    });

    self.__selectCmdBut = $('#select-cmd-but');
    self.__downloadCmdBut = $('#download-cmd-but');

    self.__selectStdOutBut = $('#select-std-output-but');
    self.__downloadStdOutBut = $('#download-std-output-but');

    self.__selectStdErrOutBut = $('#select-stderr-but');
    self.__downloadStdErrOut = $('#download-stderr-but');

    self.__selectAllText = function(pre) {
        var ta = $('<textarea>');
        ta.text(pre.text());
        pre.after(ta);
        ta.width(pre.width());
        ta.height(pre.height());
        pre.hide();
        ta.focus();
        ta.select();

        ta.focusout(function() {
            ta.remove();
            pre.show();
        });
    };

    self.__selectCmdBut.click(function() {
        self.__selectAllText($('#command'));
    });

    self.__selectStdOutBut.click(function() {
        self.__selectAllText($('#console-out'));
    });

    self.__selectStdErrOutBut.click(function() {
        self.__selectAllText($('#console-err'));
    });

    self.fillPlatforms = function (data) {

        if (self.platformsTable.visible)
            self.platformsTable.fadeOut('fast');

        self.platformsTable.empty();

        if (!data) {
            return;
        }
        orig_platfTable = self.platformsTable;
        self.platformsTable.append(document.createElement("tbody"));
        self.platformsTable = $('#platforms-table > tbody');

        data['platforms'].forEach(function (platform) {
            var name = platform['name'];
            var wasBusiedBy = platform['wasBusiedBy'];
            var wasBusiedByID = platform['wasBusiedByID'];
            var parameters = platform['parameters'];

            var row = $('<tr>'); for (var i = 0; i < 5; ++i) row.append($('<td>'));
            var columns = row.find('td');

            $(columns[0])
                .text(name);

            $(columns[1])
                .append($('<div>')
                    .addClass('username-label label')
                    .addClass(wasBusiedBy === 'free' ? 'label-danger' : 'label-primary')
                    .text(wasBusiedBy)
                )
                .addClass('hidden-xs')
            ;

            parameters.forEach(function (parameter) {
                var label = $('<span>')
                    .addClass('platform-parameter-label label label-info')
                    .addClass('hidden-xs hidden-sm hidden-md')
                    .text(parameter['name'] + ': ' + parameter['value']);
                $(columns[2])
                    .append(label);
            });

            $(columns[3])
                .append($('<button>')
                    .attr({ 'type': 'button', 'value': platform['id']})
                    .addClass('btn btn-success')
                    .text('History')
                    .click(function () {
                        self.model.fetchActions($(this).val(), 0, function () {
                            self.historyModal.get(0)['platformID'] = platform['id'];
                            self.historyModal['modal']('show');
                        });
                    }));

            $(columns[4])
                .append($('<button>')
                    .attr({'type': 'button', 'value': platform['id']})
                    .addClass('btn')
                    .addClass(wasBusiedBy == "free" ? 'btn-primary' : 'btn-danger')
                    .addClass(wasBusiedByID && (wasBusiedByID !== window['USER_ID'] &&  !window['IS_STAFF']) ? 'disabled' : '')
                    .text(wasBusiedBy == "free" ? 'Lock' : 'Unlock')
                    .click(function () {
                        var id = $(this).val();
                        var state = wasBusiedBy == "free" ? "lock" : "unlock";
                        self.model.setPlatformState(id, state);
                    })
                );

            self.platformsTable.append(row);
        });
        self.platformsTable = orig_platfTable;
        self.platformsTable.fadeIn('slow');
    };

    self.fillBusiedPlatforms = function (data) {
        self.platformsCombo.find('option.enabled').addClass('remove');

        if (!data) {
            var disabled = self.platformsCombo.find('option[value="-1"]').clone();
            self.platformsCombo.empty();
            self.platformsCombo.append(disabled);
            return;
        }

        data['platforms'].forEach(function (platform) {
            if (platform['wasBusiedByID'] === window['USER_ID']) {
                var o = self.platformsCombo.find('option[value="{0}"]'.format(platform['id']));

                if (o.length === 0) {
                    self.platformsCombo
                        .append($('<option>')
                            .addClass('enabled')
                            .attr('value', platform['id'])
                            .text(platform['name'])
                        );
                } else {
                    o.text(platform['name']);
                    o.removeClass('remove');
                }
            }
        });

        if (self.platformsCombo.find(':selected').hasClass('remove')) {
            self.platformsCombo.find(':nth-child(0)').attr('selected', 'selected');
            model.fetchJobs(-1);
            model.fetchJobParameters(-1, -1);
            self.clearJobParameters();
            self.runJobButton.addClass('disabled');
        }

        self.platformsCombo.find('option.remove').remove();
    };

    self.fillJobs = function (data) {
        self.jobsCombo.find('option.enabled').addClass('remove');

        if (!data) {
            var disabled = self.jobsCombo.find('option[value="-1"]').clone();
            self.jobsCombo.empty();
            self.jobsCombo.append(disabled);
            return;
        }

        data['jobs'].forEach(function (job) {
            var o = self.jobsCombo.find('option[value="{0}"]'.format(job['id']));

            if (o.length === 0) {
                self.jobsCombo
                    .append($('<option>')
                        .addClass('enabled')
                        .attr('value', job['id'])
                        .text(job['name'])
                    );
            } else {
                o.text(job['name']);
                o.removeClass('remove');
            }
        });

        self.jobsCombo.find('option.remove').remove();
    };

    self.clearJobParameters = function() {
        self.parametersValidator.removeField(self.parametersForm.find('.parameter-input'));
        self.parametersContainer.empty();
        self.advancedParametersButton.addClass('hidden');
    };

    self.fillJobParameters = function (data) {
        var fill = function () {
            self.clearJobParameters();

            if (self.platformsCombo.val() < 0 || self.jobsCombo.val() < 0) { return; }

            if (!data) { return; }

            data['parameters'].forEach(function (parameter) {
                var input = null;
                var validationOptions = {
                    validators: {
                        none: 'none'
                    }
                };

                switch (parameter['type']) {
                    case self.PARAMETER_TYPE_INT:
                        input = $('<input>')
                            .attr('type', 'text');
                        validationOptions.validators = {
                            greaterThan: {
                                value: "0",
                                message: "The value must be greater than zero"
                            },
                            integer: {
                                message: "The value must be valid integer"
                            }
                        };
                        break;
                    case self.PARAMETER_TYPE_REAL:
                        input = $('<input>')
                            .attr('type', 'text');
                        validationOptions.validators = {
                            numeric: {
                                separator: ".",
                                message: "The value is not valid decimal"
                            }
                        };
                        break;
                    case self.PARAMETER_TYPE_BOOL:
                        input = $('<select>')
                            .append($('<option>')
                                .attr('value', 0)
                                .text('False')
                        )
                            .append($('<option>')
                                .attr('value', 1)
                                .text('True')
                        );
                        break;
                    case self.PARAMETER_TYPE_TEXT:
                    case self.PARAMETER_TYPE_RMTF:
                        input = $('<textarea>')
                            .attr('rows', "35");
                        break;
                    case self.PARAMETER_TYPE_SELECT:
                        input = $('<select>');
                        parameter['options'].forEach(function(e) {
                            input.append($('<option>').attr('value', e).text(e));
                        });
                        break;
                    default:
                        input = $('<input>')
                            .attr('type', 'text');
                        break;
                }

                input
                    .addClass('form-control')
                    .attr('name', 'parameter[{0}]'.format(parameter['id']))
                    .attr('id', 'parameter[{0}]'.format(parameter['id']))
                    .val(parameter['value']);

                if (parameter['required'] === true) {
                    validationOptions.validators['notEmpty'] = {
                        message: "The filed is required"
                    };
                }

                var parameterFormGroup = $('<div>')
                    .addClass('form-group')
                    .append($('<label>')
                        .addClass('control-label')
                        .attr('for', 'parameter[{0}]'.format(parameter['id']))
                        .text(parameter['description'])
                    )
                    .append(input);

                if (parameter['advanced'] && (!parameter['required'] || parameter['value'].length)) {
                    parameterFormGroup.addClass('advanced-parameter hidden');
                }

                self.parametersContainer
                    .append(parameterFormGroup);

                self.parametersContainer.removeClass('hidden');

                if  (0 <= [self.PARAMETER_TYPE_TEXT, self.PARAMETER_TYPE_RMTF].indexOf(parameter['type'])) {
                    var editor = CodeMirror.fromTextArea(input.get(0), {
                        'lineNumbers': true,
                        'mode': parameter['mode'] ? parameter['mode'] : 'undefined',
                        'value': parameter['value']
                    });

                    editor.on('change', function () {
                        editor.save();
                    });

                    editor.refresh();
                } else {
                    input.addClass('parameter-input');
                    self.parametersValidator.addField(input, validationOptions);
                }
            });

            self.runJobButton.removeClass('disabled');
            self.runJobButton.get(0)['askUser'] = data['askUser'];
            self.runJobButton.get(0)['jobName'] = data['jobName'];

            if (self.parametersContainer.find('.advanced-parameter').length > 0) {
                self.advancedParametersButton.removeClass('hidden');
            }
        };

        self.parametersContainer.addClass('hidden');
        fill();
    };

    self.fillTasks = function (data) {
       
        var makeStatusButton = function(task) {
            var button = $('<button>')
                            .addClass('btn btn-xs task-state')
                            .addClass(self.TASK_STATE_LABEL_CLASS[task['state']])
                            .append(task['stateDisplay']);

            button.attr({
                            'data-toggle': 'tooltip',
                            'data-placement': 'top',
                            'title': 'you can restart this task'
                        });

            if (task['platformBusiedByID'] == window['USER_ID'] &&
                0 <= [self.TASK_STATE_ERROR, self.TASK_STATE_SUCCESS].indexOf(task['state']))
            {
                button
                    .append(' ')
                    .append($('<span>').addClass('glyphicon glyphicon-repeat'));

                button.click(function () {
                    var modal = $('#ask-user-modal');
                    var yes = false;
                    $('#ask-user-what').text('restart "{0}" on {1}'.format(task['job'], task['platform']));
                    $('#ask-user-yes').off().click(function() { yes = true; });
                    modal.off().on('hidden.bs.modal', function() {
                        if (yes) {
                            $.when(
                                $.get('/ajax_restart_task/{0}/'.format(task['id']))
                            ).then(
                                self.model.fetchTaskPage(PAGE_NUM)
                            );
                        } else {
                            return false;
                        }
                    });

                    modal.modal('show');
                });
            } else {
                button.addClass('disabled');
            }

            button.tooltip();

            return button;
        };

        var makeRow = function (task) {
            var row = $('<tr>'); for (var i = 0; i < 9; ++i) row.append($('<td>'));
                row.get(0)['taskID'] = task['id'];
                row.get(0)['taskState'] = task['state'];

            if (task['state'] in [self.TASK_STATE_NEW, self.TASK_STATE_IN_POGRESS])
                row.addClass('refresh');

            var columns = row.find('td');

            $(columns[0])
                .text(task['id'])
                .addClass('hidden-xs hidden-sm hidden-md');
            $(columns[1])
                .text(task['platform']);
            $(columns[2])
                .text(task['job']);
            $(columns[3])
                .text(task['user']);
            $(columns[4])
                .text(task['startDate'])
                .addClass('hidden-xs hidden-sm hidden-md');
            $(columns[5])
                .text(task['finishDate'])
                .addClass('hidden-xs hidden-sm hidden-md');
            $(columns[6])
                .append(makeStatusButton(task));

            var btnParameters = $('<button>')
                .addClass('btn btn-link')
                .attr('type', 'button')
                .text('show parameters')
                .click(function () {
                    self.model.fetchTaskParameters(task['id'], function () {
                        self.taskParametersModal['modal']('show');
                    })
                });

            var btnLog = $('<button>')
                .addClass('btn btn-link')
                .attr('type', 'button')
                .text('show log')
                .click(function () {
                    self.model.fetchTaskLog(task['id'], function () {
                        self.taskLogModal['taskID'] = row.get(0)['taskID'];
                        self.taskLogModal['taskState'] = row.get(0)['taskState'];
                        self.taskLogModal['modal']('show');
                    })
                });

            $(columns[7])
                .append(btnParameters)
                .addClass('hidden-xs hidden-sm hidden-md');

            $(columns[8])
                .append(btnLog)
                .addClass('hidden-xs hidden-sm hidden-md');

            return row;
        };

        var updateRow = function (row, task) {
            row.get(0)['taskState'] = task['state'];

            var columns = row.find('td');
            $(columns[5])
                .text(task['finishDate']);

            var state = null;

            if (task['state'] == self.TASK_STATE_IN_POGRESS) {
                state = $('<div>')
                    .addClass('progress task-state')
                    .append($('<div>')
                        .addClass('progress-bar progress-bar-striped active')
                        .attr('role', 'progressbar')
                        .attr('aria-valuenow', task['progress'])
                        .attr('aria-valuemin', '0')
                        .attr('aria-valuemax', '100')
                        .css('width', '{0}%'.format(task['progress']))
                        .append($('<span>')
                            .addClass('sr-only')
                            .text(task['progress'] + '%')
                        )
                    );
            } else {
                state = makeStatusButton(task);
            }

            $(columns[6])
                .empty()
                .append(state);
        };
        
        var updatePaginator = function(curr_page, max_pages, PAGES_LEFT) {
            var MAX_VISIBLE_PAGES = 5
            if (PAGES_LEFT < 1 || PAGES_LEFT > MAX_VISIBLE_PAGES)
                PAGES_LEFT = MAX_VISIBLE_PAGES
            
            var min_page = 1
            var max_page = curr_page + PAGES_LEFT
            
            if (curr_page > PAGES_LEFT) {
                min_page = curr_page - PAGES_LEFT
            }
            if (max_page > MAX_PAGES) {
                max_page = MAX_PAGES
            }
            
            var page_prev = "<li style=\"cursor: pointer\"><span aria-label=\"First\" aria-hidden=\"true\" id=\"page_scroller\" data-page-num=\"1\">&laquo;</span></li>"
            var page_next = "<li style=\"cursor: pointer\"><span aria-label=\"Last\" aria-hidden=\"false\" id=\"page_scroller\" data-page-num=\"" + MAX_PAGES + "\" >&raquo;</span></li>"
            
            if ( min_page <= 1 ) {
                page_prev = "<li class=\"disabled\"><span aria-hidden=\"true\">&laquo;</span></li>"
            }
            if ( max_page >= max_pages ){
                page_next = "<li class=\"disabled\"><span aria-hidden=\"true\">&raquo;</span></li>"
            }
            
            var pagin = ""
            
            for(i = min_page; i<=max_page; i++) {
                if( i == curr_page ) {
                    pagin += "<li class=\"active\"><a>"+ i +"</a></li>"
                    continue
                }
                pagin += "<li style=\"cursor: pointer\"><span data-page-num=\""+i+"\" id=\"page_scroller\">" + i +"</span></li>"
            }
            
            return page_prev + pagin + page_next
        };
        
        self.taskTable.empty();
        
        if (!data) {
            return;
        }
        
        if (MAX_PAGES != data['max-pages'] || $('ul#paginator > li.active').text() != PAGE_NUM){
            MAX_PAGES = data['max-pages']
            var VISIBLE_PAGES = 4
            if (MAX_PAGES < VISIBLE_PAGES)
                VISIBLE_PAGES = MAX_PAGES

            if (PAGE_NUM > MAX_PAGES)
                PAGE_NUM = MAX_PAGES

            $('#paginator').html(updatePaginator(PAGE_NUM, MAX_PAGES, VISIBLE_PAGES));
            $('span#page_scroller').click(function(){
                var page = $(this).data('page-num')
                if ( 1 <= page && page <= MAX_PAGES && page != PAGE_NUM) {
                    PAGE_NUM = page;
                    self.model.fetchTaskPage(PAGE_NUM);
                }
            });
        }

        
        if (!self.taskTable.children().length) {
            data['tasks'].forEach(function (task) {
                self.taskTable.append(makeRow(task));
            });

            return;
        }

        data['tasks'].forEach(function (task) {
            var current = self.taskTable.children().first();

            while (true) {

                if (current.length === 0) {
                    self.taskTable.append(makeRow(task));
                    break;
                }

                var cID = current.get(0)['taskID'];
                var tID = task['id'];

                if (cID == tID) {
                    updateRow(current, task);
                    break;
                } else if (cID < tID) {
                    current.before(makeRow(task));
                    break;
                }

                current = current.next();
            }
        });
    };

    self.fillActionsHistory = function (data) {
        self.historyTable.empty();

        if (!data) { return; }

        data['actions'].forEach(function (action) {
            var row = $('<tr>'); for (var i = 0; i < 4; ++i) row.append($('<td>'));
            var columns = row.find('td');

            $(columns[0])
                .text(action['user']);
            $(columns[1])
                .text(action['type']);
            $(columns[2])
                .text(action['arguments']);
            $(columns[3])
                .text(action['timestamp']);

            self.historyTable.append(row);
        });
    };

    self.fillTaskParameters = function (data) {
        var container = $('#task-parameters-container');
            container.empty();

        if (!data) { return; }

        data['taskParameters'].forEach(function (parameter) {
            var row = $('<div>');
                row.addClass('row');
            var colName = $('<div>');
                colName.addClass('col-lg-4');
            var colValue = $('<div>');
                colValue.addClass('col-lg-8');

            colName
                .append($('<span>')
                    .addClass('label label-primary task-parameter-label')
                    .text(parameter['name'])
                );
            colValue
                .append($('<pre>')
                    .text(parameter['value'])
                );

            row.append(colName).append(colValue);
            container.append(row);
        });
    };

    self.fillTaskLog = function (data) {
        $('#command').text(data['command']);
        $('#console-out').text(data['output']);
        $('#console-err').text(data['error']);
    };

    self.model.addListener(new Listener(model.PLATFORMS_CHANGED, function (data) {
        self.fillPlatforms(data);
        self.fillBusiedPlatforms(data);
    }));

    self.model.addListener(new Listener(model.JOBS_CHANGED, function (data) {
        self.fillJobs(data);
    }));

    self.model.addListener(new Listener(model.JOB_PARAMETERS_CHANGED, function (data) {
        self.fillJobParameters(data);
    }));

    self.model.addListener(new Listener(model.TASKS_CHANGED, function (data) {
        self.fillTasks(data);
    }));

    self.model.addListener(new Listener(model.ACTIONS_CHANGED, function (data) {
        self.fillActionsHistory(data);
    }));

    self.model.addListener(new Listener(model.TASKS_PARAMETERS_CHANGED, function (data) {
        self.fillTaskParameters(data);
    }));

    self.model.addListener(new Listener(model.TASK_LOG_CHANGED, function (data) {
        self.fillTaskLog(data);
    }));

    self.model.fetchPlatforms();
    self.model.fetchTaskPage();

    $('#refresh-platforms').click(function () {
        self.model.fetchPlatforms();
    });

    var taskLogRefreshTimer = new Timer(function() {
        self.model.fetchTaskLog(self.taskLogModal['taskID']);
    });

    self.taskLogModal.on('show.bs.modal', function() {
        if (0 <= [self.TASK_STATE_NEW, self.TASK_STATE_IN_QUEUE, self.TASK_STATE_NEW, self.TASK_STATE_IN_POGRESS]
            .indexOf(self.taskLogModal['taskState']))
        {
            taskLogRefreshTimer.start(3000);
        }

        self.__downloadCmdBut.off('click').click(function () {
            window.location = '/download_task_stuff/{0}/command/'.format(self.taskLogModal['taskID']);
        });

        self.__downloadStdOutBut.off('click').click(function () {
            window.location = '/download_task_stuff/{0}/stdout/'.format(self.taskLogModal['taskID']);
        });

        self.__downloadStdErrOut.off('click').click(function () {
            window.location = '/download_task_stuff/{0}/stderr/'.format(self.taskLogModal['taskID']);
        });
    });

    self.taskLogModal.on('hide.bs.modal', function() {
        taskLogRefreshTimer.stop();
    });
}

$(function() {
    var model = new Model(Number(window['PROJECT_ID']), function (data) {
        var errorModal = $('#error-modal');
        var errorText = $('#error-text');

        if (!errorModal.visible) {
            errorText.text(data['statusText']);
            errorModal.modal('show');
        }
    });

    var view = new View(model);

    var refreshPlatformsTimer = new Timer(function () {
        model.fetchPlatforms();
        model.fetchTaskPage(PAGE_NUM);
    });
        refreshPlatformsTimer.start(3000);

    window.onbeforeunload = function() {
        model.__errorHandler = null;
        refreshPlatformsTimer.stop();
    };
});
