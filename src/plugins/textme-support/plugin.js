QueryBuilder.defaults({

    textMeOperators: {
        // @formatter:off
        equal:               function(v) { return v[0]; },
        not_equal:           function(v) { return { '!$eq': v[0] }; },
        in:                  function(v) { return { '$in': v[0].split(",").map(function(item) {
            return item.trim();
        }) }; },
        not_in:              function(v) { return { '!$in': v[0].split(",").map(function(item) {
            return item.trim();
        }) }; },
        less:                function(v) { return { '$lt': v[0] }; },
        less_or_equal:       function(v) { return { '$lte': v[0] }; },
        greater:             function(v) { return { '$gt': v[0] }; },
        greater_or_equal:    function(v) { return { '$gte': v[0] }; },
        begins_with:         function(v) { return { '$regex': '^' + Utils.escapeRegExp(v[0]) }; },
        not_begins_with:     function(v) { return { '!$regex': '^' + Utils.escapeRegExp(v[0]) }; },
        contains:            function(v) { return { '$regex': Utils.escapeRegExp(v[0]) }; },
        not_contains:        function(v) { return { '!$regex': Utils.escapeRegExp(v[0]) }; },
        ends_with:           function(v) { return { '$regex': Utils.escapeRegExp(v[0]) + '$' }; },
        not_ends_with:       function(v) { return { '!$regex': Utils.escapeRegExp(v[0]) + '$' }; },
        is_empty:            function(v) { return ''; },
        is_not_empty:        function(v) { return { '!$eq': '' }; },
        is_null:             function(v) { return null; },
        is_not_null:         function(v) { return { '!$eq': null }; },
        in_ratio:            function(v) { return { '$ratio': [v[0], v[1], v[2]] }; },
        not_in_ratio:        function(v) { return { '!$ratio': [v[0], v[1], v[2]] }; },
        has_tier_and_depth:  function(v) { return { '$has_tier_and_depth': {'tier': v[0], 'depth': v[1]} } },
        has_not_tier_and_depth: function(v) { return { '!$has_tier_and_depth': {'tier': v[0], 'depth': v[1] } } }
        // @formatter:on
    },

    textMeRuleOperators: {
        '$eq': function(v) {
            if (v && typeof v === 'object' && !(v instanceof Array) && !(v instanceof Date)) {
                v = v['$eq'];
            }
            return {
                'val': v,
                'op': v === null ? 'is_null': (v === '' ? 'is_empty' : 'equal')
            };
        },
        '!$eq': function(v) {
            v = v['!$eq'];
            return {
                'val': v,
                'op': v === null ? 'is_not_null': (v === '' ? 'is_not_empty' : 'not_equal')
            };
        },
        '$regex': function(v) {
            v = v['$regex'];

            if (v.slice(-1) == '$') {
                return { 'val': v.slice(0, -1), 'op': 'ends_with' };
            } else if (v.slice(0, 1) == '^') {
                return { 'val': v.slice(1), 'op': 'begins_with' };
            }
            return { 'val': v, 'op': 'contains' };
        },
        '!$regex': function(v) {
            v = v['!$regex'];

            if (v.slice(-1) == '$') {
                return { 'val': v.slice(0, -1), 'op': 'not_ends_with' };
            } else if (v.slice(0, 1) == '^') {
                return { 'val': v.slice(1), 'op': 'not_begins_with' };
            }
            return { 'val': v, 'op': 'not_contains' };
        },
        '$in': function(v) {
            return { 'val': v.$in.join(), 'op': 'in' };
        },
        '!$in': function(v) {
            return { 'val': v['!$in'].join(), 'op': 'not_in' };
        },
        '$lt': function(v) {
            return { 'val': v.$lt, 'op': 'less' };
        },
        '$lte': function(v) {
            return { 'val': v.$lte, 'op': 'less_or_equal' };
        },
        '$gt': function(v) {
            return { 'val': v.$gt, 'op': 'greater' };
        },
        '$gte': function(v) {
            return { 'val': v.$gte, 'op': 'greater_or_equal' };
        },
        '$ratio': function(v) {
            return { 'val': [v['$ratio'][0], v['$ratio'][1], v['$ratio'][1]], 'op': 'in_ratio' }
        },
        '!$ratio': function(v) {
            return { 'val': [v['!$ratio'][0], v['!$ratio'][1], v['!$ratio'][1]], 'op': 'not_in_ratio' }
        },
        '$has_tier_and_depth': function(v) {
            return { 'val': [v['$has_tier_and_depth']['tier'], v['$has_tier_and_depth']['depth']], 'op': 'has_tier_and_depth' }
        },
        '!$has_tier_and_depth': function(v) {
            return { 'val': [v['!$has_tier_and_depth']['tier'], v['!$has_tier_and_depth']['depth']], 'op': 'has_not_tier_and_depth' }
        }
    }

});

QueryBuilder.extend({

    getTextMe: function(data) {
        data = (data == undefined) ? this.getRules() : data;

        if (!data) {
            return null;
        }

        var self = this;

        return (function parse(group) {
            if (!group.condition) {
                group.condition = self.settings.default_condition;
            }

            if (['AND', 'OR'].indexOf(group.condition.toUpperCase()) === -1) {
                Utils.error('UndefinedTextMeCondition', 'Unable to build TextMe query with condition "{0}"', group.condition);
            }

            if (!group.rules) {
                return {};
            }

            var parts = [];

            group.rules.forEach(function(rule) {
                if (rule.rules && rule.rules.length > 0) {
                    parts.push(parse(rule));
                } else {
                    var mdb = self.settings.textMeOperators[rule.operator];
                    var op = self.getOperatorByType(rule.operator);

                    if (mdb == undefined) {
                        Utils.error('UndefinedTextMeOperator', 'Unknown TextMe operation for operator "{0}"', rule.operator);
                    }

                    if (op.nb_inputs !== 0) {
                        if (!(rule.value instanceof Array)) {
                            rule.value = [rule.value];
                        }
                    }

                    var field = self.change('getTextMeDbFieldID', rule.field, rule);

                    var ruleExpression = {};
                    ruleExpression[field] = mdb.call(self, rule.value);

                    parts.push(self.change('ruleToTextMe', ruleExpression, rule, rule.value, mdb));
                }
            });

            var groupExpression = {};
            groupExpression['$' + group.condition.toLowerCase()] = parts;

            return self.change('groupToTextMe', groupExpression, group);
        }(data));
    },

    getRulesFromTextMe: function(query) {
        if (query === undefined || query === null) {
            return null;
        }

        var self = this;

        query = self.change('parseTextMeNode', query);

        // A plugin returned a group
        if ('rules' in query && 'condition' in query) {
            return query;
        }

        // A plugin returned a rule
        if ('id' in query && 'operator' in query && 'value' in query) {
            return {
                condition: this.settings.default_condition,
                rules: [query]
            };
        }

        var key = self.getTextMeCondition(query);
        if (!key) {
            Utils.error('TextMeParse', 'Invalid TextMe query format');
        }

        return (function parse(data, topKey) {
            var rules = data[topKey];
            var parts = [];

            rules.forEach(function(data) {
                data = self.change('parseTextMeNode', data);

                // A plugin returned a group
                if ('rules' in data && 'condition' in data) {
                    parts.push(data);
                    return;
                }

                // A plugin returnes a rule
                if ('id' in data && 'operator' in data && 'value' in data) {
                    parts.push(data);
                    return;
                }

                var key = self.getTextMeCondition(data);
                if (key) {
                    parts.push(parse(data, key));
                } else {
                    var field = Object.keys(data)[0];
                    var value = data[field];

                    var operator = self.getTextMeOperator(value);
                    if (operator === undefined) {
                        Utils.error('textMeParse', 'Invalid TextMe query format');
                    }

                    var mdbrl = self.settings.textMeRuleOperators[operator];
                    if (mdbrl === undefined) {
                        Utils.error('UndefinedTextMeOperator', 'JSON Rule operation unknown for operator "{0}"', operator);
                    }

                    var opVal = mdbrl.call(self, value);

                    var id = self.getTextMeDbFieldID(field, value);

                    var rule = self.change('textMeToRule', {
                        id: id,
                        field: field,
                        operator: opVal.op,
                        value: opVal.val
                    }, data);

                    parts.push(rule);
                }
            });

            return self.change('textMeToGroup', {
                condition: topKey.replace('$', '').toUpperCase(),
                rules: parts
            })
        }(query, key));
    },

    setRulesFromTextMe: function(query) {
        this.setRules(this.getRulesFromTextMe(query));
    },

    getTextMeDbFieldID: function(field, value) {
        var matchingFilters = this.filters.filter(function(filter) {
            return filter.field === field;
        });

        var id;
        if (matchingFilters.length === 1) {
            id = matchingFilters[0].id;
        } else {
            id = this.change('getTextMeDbFieldID', field, value);
        }

        return id;
    },

    getTextMeOperator: function(data) {
        if (data !== null && typeof data === 'object') {
            if (data.$gte !== undefined && data.$lte !== undefined) {
                return 'between';
            }
            if (data.$lt !== undefined && data.$gt !== undefined) {
                return 'not_between';
            }

            var knownKeys = Object.keys(data).filter(function(key) {
                return !!this.settings.textMeRuleOperators[key];
            }.bind(this));

            if (knownKeys.length === 1) {
                return knownKeys[0];
            }
        } else {
            return '$eq';
        }
    },

    getTextMeCondition: function(data) {
        var keys = Object.keys(data);

        for (var i = 0, l = keys.length; i < l; i++) {
            if (keys[i].toLowerCase() === '$or' || keys[i].toLowerCase() === '$and') {
                return keys[i];
            }
        }
    }

});
