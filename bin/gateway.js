function Context() {
}
process.env['PATH'] = process.env['PATH']
+ ':'
+ process.env['LAMBDA_TASK_ROOT']
exports.Context = Context;