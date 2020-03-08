var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var CommentSchema = new Schema({
  username: String,
  body: String
});

var Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;
