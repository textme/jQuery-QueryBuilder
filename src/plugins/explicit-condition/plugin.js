/**
 * @class ExplicitCondition
 * @memberof module:plugins
 * @description Provide another way to display the conditionnal operator in a group and to hilight a group before delete
 * @param {object} [options]
 * @param {object} [options.hoverOnDelete]
 * @param {string} [options.hoverOnDelete.background]
 * @param {string} [options.hoverOnDelete.border]
 * @throws ConfigError
 */
QueryBuilder.define('explicit-condition', function(options) {
    var self = this;
    var hoverOnDelete;
    if (options) {
        hoverOnDelete = options.hoverOnDelete;
    }

    function insertExplicitCondition(model) {
        var $b = $('<button class="explicit-condition" name="' + model.parent.id + '_cond">' + self.translate(model.parent.condition) + '</button>');
        model.$el.prepend($b);
        $b.on('click', function(e) {
            e.preventDefault();
            model.parent.condition = self.settings.conditionOpposites[model.parent.condition];
        });
    }

    function linkExplicitCondition(model) {
        deleteExplicitCondition(model);
        if (model.getPos() === 0) return;
        insertExplicitCondition(model);
    }

    function deleteExplicitCondition(model) {
        model.$el.find('>' + QueryBuilder.selectors.explicit_condition).remove();
    }

    function updateExplicitCondition(model, condition) {
        model.$el.find('>' + QueryBuilder.selectors.explicit_condition).html(self.translate(condition));
    }

    function isHoverBound($button) {
        var events = jQuery._data($button[0], 'events');
        if (events === undefined) return false;
        return events.mouseover.length === 1 && events.mouseout.length === 1;

    }

    function addHoverOnDelete(model, settings) {
        var old_border, old_bg;
        var $btn_danger = model.$el.find('>' + QueryBuilder.selectors.group_header + ' .btn-danger');
        if ($btn_danger.length === 0 || isHoverBound($btn_danger)) return;
        $btn_danger.hover(function() {
            old_border = $(model.$el).css('border');
            old_bg = $(model.$el).css('background');
            $(model.$el).css('border', settings.border);
            $(model.$el).css('background', settings.background);
        }, function() {
            $(model.$el).css('border', old_border);
            $(model.$el).css('background', old_bg);
        });
    }

    function handleChangeInModel(model) {
        if (!model.parent) return;

        model.parent.each(function(rule) {
            linkExplicitCondition(rule);
        }, function(group) {
            linkExplicitCondition(group);
            if (hoverOnDelete) {
                addHoverOnDelete(group, hoverOnDelete);
            }
        });
        $('.rules-list').addClass('rules-list-explicit-condition');
    }

    this.model.on('move', function(e, model) {
        handleChangeInModel(model);
    });

    this.on('afterAddRule afterAddGroup', function(e, model) {
        handleChangeInModel(model);
    });

    this.on('beforeDeleteRule beforeDeleteGroup', function(e, model) {
        if (!model.parent) return;
        model.parent.each(function(rule) {
            if (model !== rule) {
                linkExplicitCondition(rule);
            }
        }, function(group) {
            if (model !== group) {
                linkExplicitCondition(group);
            }
        });
    });

    this.on('afterUpdateGroupCondition', function(e, group) {
        var condition = group.condition;
        group.each(function(child_rule) {
            updateExplicitCondition(child_rule, condition);
        }, function(child_group) {
            updateExplicitCondition(child_group, condition);
        });
    });

    this.on('afterAddGroup', function(e, group) {
        /* Get ride of old radio group-conditions buttons and instead we put the success buttons */
        group.$el.find(QueryBuilder.selectors.condition_container).empty().append(group.$el.find('.btn-success'));
    });
});

QueryBuilder.selectors.explicit_condition = '.explicit-condition';
