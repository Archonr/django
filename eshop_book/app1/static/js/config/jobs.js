/**
 * Created by evgeniy on 21.12.16.
 */
var JobsPage = new function() {
    var self = this;

    self.name = 'job';
    self.pageName = this.name + 's';
    self.selectedMainID = -1;
    // Elements moved to self.loadData

    self.loadData = function() {
        self.mainSel = Helpers.getByID('select_' + self.name);
        self.mainSearch = Helpers.getByID('search_' + self.name);

        self.platformSel = Helpers.getByID('platf');
        self.projectSel = Helpers.getByID('proj');
        self.askUserChkBox = Helpers.getByID('ask_user');
        self.cmdText = Helpers.getByID('cmd');

        self.modalName = 'param';
        self.modalPageName = self.name + "_" + self.modalName;

        self.Events.removeAll();
        self.mainSel.options.length = 0;
        self.mainSel.options.length = 0;
        self.platformSel.options.length = 0;

        for (jobID in General.jobs)
            General.addItemToList(General.jobs[jobID].name, self.mainSel, jobID);
        for (platfID in General.platforms)
            General.addItemToList(General.platforms[platfID].name, self.platformSel, platfID);
        for (projID in General.projects)
            General.addItemToList(General.projects[projID].name, self.projectSel, projID);

        self.Events.addAll();
    };

    self.modalLoaded = function() {
        self['modal'] = {
            btnDisabled: true,
            paramsAllSel: Helpers.getByID('select_' + self.name + '_' + self.modalName),
            paramsUsedSel: Helpers.getByID('select_' + self.name + '_used'),
            paramNameVal: Helpers.getByID('text_' + self.name + '_name'),
            paramDescVal: Helpers.getByID('text_' + self.name + '_desc'),
            paramTypeSel: Helpers.getByID('select_' + self.name + '_type'),
            paramArgVal: Helpers.getByID('text_' + self.name + '_args'),
            paramReqChck: Helpers.getByID('ask_required'),
            // TODO: Make this work!
            paramAdvChck: Helpers.getByID('ask_advanced')
        };

        self.Events.modal.removeAll();

        if (!General.params)
            return;
        for (paramID in General.params)
            General.addItemToList(General.params[paramID].name, self.modal.paramsAllSel, paramID);

        self.Events.modal.addAll();
    };

    self.Events = {
        removeAll: function() {
            self.mainSel.removeEventListener('change', self.jobChanged);
            self.projectSel.removeEventListener('change', self.paramsChanged);
            self.platformSel.removeEventListener('change', self.paramsChanged);
            self.askUserChkBox.removeEventListener('change', self.paramsChanged);
            self.cmdText.removeEventListener('blur', self.paramsChanged);
        },

        addAll: function() {
            self.mainSel.addEventListener('change', self.jobChanged);
            self.projectSel.addEventListener('change', self.paramsChanged);
            self.platformSel.addEventListener('change', self.paramsChanged);
            self.askUserChkBox.addEventListener('change', self.paramsChanged);
            self.cmdText.addEventListener('blur', self.paramsChanged);
        },

        modal: {
            removeAll: function() {
                self.modal.paramsUsedSel.removeEventListener('change', self.paramUsedChanged);

                self.modal.paramNameVal.removeEventListener('blur', self.jobParamChanged);
                self.modal.paramTypeSel.removeEventListener('change', self.jobParamChanged);
                self.modal.paramDescVal.removeEventListener('blur', self.jobParamChanged);
                self.modal.paramArgVal.removeEventListener('blur', self.jobParamChanged);
                self.modal.paramReqChck.removeEventListener('change', self.jobParamChanged);
                self.modal.paramAdvChck.removeEventListener('change', self.jobParamChanged);
            },

            addAll: function() {
                self.modal.paramsUsedSel.addEventListener('change', self.paramUsedChanged);

                self.modal.paramNameVal.addEventListener('blur', self.jobParamChanged);
                self.modal.paramTypeSel.addEventListener('change', self.jobParamChanged);
                self.modal.paramDescVal.addEventListener('blur', self.jobParamChanged);
                self.modal.paramArgVal.addEventListener('blur', self.jobParamChanged);
                self.modal.paramReqChck.addEventListener('change', self.jobParamChanged);
                self.modal.paramAdvChck.addEventListener('change', self.jobParamChanged);
            }
        }
    };

    self.currPage = function() {
        return Helpers.stringContains(self.pageName, document.location.pathname);
    };

    self.add = function() {
        var addNewItem = function(name, proj, platf, cmd, ask_user) {
            if (!name || name === "")
                return;
            var newID = General.getNewID('jobs');

            General.jobs[newID] = {
                'id': newID,
                'name': name,
                'proj': (!!proj) ? proj : null,
                'platf': (!!platf) ? platf : null,
                'cmd': (!!cmd) ? cmd : "",
                'ask_user': (typeof ask_user === 'boolean') ? ask_user : false,
                'params': {}
            };
            return newID;
        };

        var name = General.askString('Please tell us new '+ self.name +' name:');
        if (!name)
            return;

        var id = addNewItem(name);
        General.addItemToList(name, self.mainSel, id);
        Helpers.pushIfNotIn(id, General.toSave[self.pageName].changed);
    };

    self.remove = function() {
        var id = self.mainSel.selectedOptions[0].id;
        delete General.jobs[id];
        Helpers.pushIfNotIn(id, General.toSave.jobs.removed);

        General.removeSelectedItemFromList(self.mainSel);

        self.jobChanged();
    };

    self.edit = function() {
        var selItem = self.mainSel.selectedOptions[0];
        var newName = General.askString('Please tell us new '+ self.name +' name:',
                    selItem.value);
        if (!newName || newName.length < 1)
            return;

        General[self.pageName][selItem.id].name = newName;
        Helpers.pushIfNotIn(selItem.id, General.toSave[self.pageName].changed);
        General.replaceSelectedItemInList(self.mainSel.id, newName);
    };

    self.filterJob = function() {
        Helpers.filterItems(self.mainSel.options, self.mainSearch.value);
    };

    self.addParam = function() {
        var pName = General.askString('Please tell us new ' + self.modalName + ' name:');
        if (!pName || pName === "")
            return;


        var createParam = function(pName) {
            General.params.max_id += 1;
            General.params[General.params.max_id] = {
                id: General.params.max_id,
                name: pName,
                desc: 'change_me',
                type: 'STRING'
            };
            return General.params.max_id;
        };
        General.addItemToList(pName, self.modal.paramsAllSel, createParam(pName));
        Helpers.pushIfNotIn(General.params.max_id, General.toSave.params.changed);
    };

    self.removeParam = function() {
        var id = self.modal.paramsAllSel.selectedOptions[0].id;
        General.removeSelectedItemFromList('select_' + self.modalPageName);
        delete General.params[id];
        Helpers.pushIfNotIn(id, General.toSave.params.removed);
    };

    self.add_used = function() {
        if (self.modal.paramsAllSel.selectedIndex <= -1 ||
            self.mainSel.selectedIndex <= -1)
            return;
        var param = self.modal.paramsAllSel.selectedOptions[0]; // 1

        self.modal.paramsAllSel.selectedOptions[0].setAttribute("style", "display: none;");
        General.addItemToList(param.value, self.modal.paramsUsedSel, param.id);

        General[self.pageName][self.mainSel.selectedOptions[0].id].params[param.id] = {  // 2, 3
            id: parseInt(param.id),
            args: '',
            required: false,
            advanced: false
        };

        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave[self.pageName].changed);  // 4
    };

    self.remove_used = function() {
        if (self.modal.paramsUsedSel.selectedIndex <= -1 ||
            self.mainSel.selectedIndex <= -1)
            return;

        var param = self.modal.paramsUsedSel.selectedOptions[0];
        self.modal.paramsAllSel.options.namedItem(param.id).removeAttribute("style");
        self.modal.paramsUsedSel.remove(self.modal.paramsUsedSel.selectedIndex);

        Helpers.removeIfInDict(param.id, General[self.pageName][self.mainSel.selectedOptions[0].id].params);
        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave[self.pageName].changed);
    };

    /**
     * Called when main job index is changed
     */
    self.jobChanged = function () {
        if (self.mainSel.selectedIndex <= -1){
            if (!self.modal.btnDisabled)
                self.modal.btnDisabled = Helpers.getByID('show_params').disabled = true;
            return;
        }

        self.selectedMainID = self.mainSel.selectedOptions[0].id;

        if (self.modal.btnDisabled && Helpers.getByID('show_params').disabled)
            self.modal.btnDisabled = Helpers.getByID('show_params').disabled = false;
        // TODO: Refactor 'job' -> 'item'
        var job = General.jobs[self.mainSel.selectedOptions[0].id];
        $(self.projectSel).val((!!General.projects[job.proj]) ?
            General.projects[job.proj].name : "");
        $(self.platformSel).val((!!General.platforms[job.platf]) ?
            General.platforms[job.platf].name : "");
        self.cmdText.value = job.cmd;
        self.askUserChkBox.checked = job.ask_user;

        // Set needed job params
        Helpers.filterByID(self.modal.paramsAllSel.options, Object.keys(job.params), false);

        self.modal.paramsUsedSel.options.length = 0;
        for (param in job.params){
            paramItem = job.params[param];
            General.addItemToList(General.params[paramItem.id].name, self.modal.paramsUsedSel, paramItem.id);
        }

    };

    self.paramsChanged = function() {

        var selector = this;

        if (self.mainSel.selectedIndex <= -1)
            return;

        var id = self.selectedMainID;

        // General['jobs'][job_id]['(name|proj|platf|cmd|ask_user)']
        General[self.pageName][id][selector.id] = (function(){
            switch(selector.tagName.toLowerCase()){
                case 'textarea':
                case 'text':
                    return selector.value;
                    break;
                case 'select':
                    if (selector.multiple) {
                        // Get selected values as list
                        return $(selector).children(':selected').map(function (i, el) {
                            var res = [];
                            res.push(el.id);
                            return res;
                        }).get();
                    } else {
                        return selector.selectedOptions[0].id;
                    }
                    break;
                case 'input':
                    return (selector.type == 'checkbox') ? selector.checked : selector.value;
                    break;
                default:
                    return null;
                    break;
            }
        })();

        Helpers.pushIfNotIn(id, General.toSave.jobs.changed);
    };

    /**
     * Called when selected job parameter index is changed
     */
    self.paramUsedChanged = function() {
        if (self.mainSel.selectedIndex <= -1 ||
            self.modal.paramsUsedSel <= -1)
            return;

        var jobParam = General.jobs[self.mainSel.selectedOptions[0].id]
            .params[self.modal.paramsUsedSel.selectedOptions[0].id];
        var genParam = General.params[jobParam.id];

        self.modal.paramNameVal.value = genParam.name;
        self.modal.paramTypeSel.value = genParam.type;
        self.modal.paramDescVal.value = genParam.desc;
        self.modal.paramArgVal.value = jobParam.args;
        self.modal.paramReqChck.checked = jobParam.required;
        self.modal.paramAdvChck.checked = jobParam.advanced;
    };

    /**
     * Called when values have been changed for selected job parameter
     */
    self.jobParamChanged = function() {
        var selector = this;
        var vType = selector.id.split('_').pop();
        switch(vType){
            case 'desc':
            case 'type':
                General.params[self.modal.paramsUsedSel.selectedOptions[0].id][vType] = selector.value;
                Helpers.pushIfNotIn(self.modal.paramsUsedSel.selectedOptions[0].id, General.toSave.params.changed);
                break;
            case 'name':
                if (selector.value === "")
                    return;
                self.modal.paramsUsedSel.selectedOptions[0].value = selector.value;
                General.params[self.modal.paramsUsedSel.selectedOptions[0].id].name = selector.value;
                General.replaceItemInList(self.modal.paramsUsedSel.selectedIndex,
                    selector.value, self.modal.paramsUsedSel);
                Helpers.pushIfNotIn(self.modal.paramsUsedSel.selectedOptions[0].id, General.toSave.params.changed);
                break;
            // case 'args':
            default:
                General[self.pageName][self.mainSel.selectedOptions[0].id]
                    .params[self.modal.paramsUsedSel.selectedOptions[0].id][vType] =
                    (selector.type != 'checkbox') ? selector.value : selector.checked;

                Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave[self.pageName].changed);
                break;
        }
    };

    self.funcMap = {
        'add_job': self.add,
        'edit_job': self.edit,
        'remove_job': self.remove,
        'search_job': self.filterJob,
        'add_job_param': self.addParam,
        'remove_job_param': self.removeParam,
        'add_job_used': self.add_used,
        'remove_job_used': self.remove_used
    };
};