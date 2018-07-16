/**
 * @class AddSuperGroup
 * @memberof module:plugins
 * @description Provide an action to embrace a group by a new super group
 * @param {object} [options]
 * @param {string} [options.icon='glyphicon glyphicon-indent-left']
 * @param {object} [options.icon= define class and name of the icon to display]
 * @param {string} [options.icon.class= class name]
 * @param {string} [options.icon.name= name]
 * @throws ConfigError
 */
QueryBuilder.define('add-super-group', function(options) {
    var self = this;

    var icon = options.icon;

    this.on('afterAddGroup', function(e, group) {
        var ico;
        if (typeof icon === 'string') {
            ico = '<i class="' + icon + '"></i>';
        } else {
            ico = '<i class="' + icon.class + '">' + icon.name + '</i>';
        }

        var $button = $('<button class="btn btn-xs btn-success add-super-group"  data-add="super-group">' +
            ico + (icon.with_text || icon.with_text === undefined ? ' Add super-group' : '') +
            '</button>');

        group.$el.find('>' + QueryBuilder.selectors.group_header + ' .btn-success').last().after($button);

        $button.on('click', function() {
            var superGroup;
            if (group.level === 1) {
                /* For the root group */

                /* We save the list and the order of each element already existing in the root group */
                var toMove = [];
                group.each(function(rule) {
                    toMove.push([rule.getPos(), rule]);
                }, function(g) {
                    toMove.push([g.getPos(), g]);
                });
                Utils.sortByKey(toMove, '0');

                superGroup = self.addGroup(group, false);
                superGroup.condition = group.condition;
                superGroup.moveAtBegin(group);
                self.addRule(group);

                toMove.forEach(function(el) {
                    el[1].move(superGroup, el[0]);
                });
            } else {
                /* For a common group */
                superGroup = self.addGroup(group);
                superGroup.condition = group.condition;
                superGroup.move(group.parent, group.getPos());
                group.moveAtBegin(superGroup);
            }
        });
    });
}, {
    icon: 'glyphicon glyphicon-indent-left'
});

