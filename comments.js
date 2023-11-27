// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database
const commentsByPostId = {};

// Routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  // Create new comment
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get comments for the post
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment to the comments
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments
  commentsByPostId[req.params.id] = comments;

  // Emit event
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Event handler
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;

    // Get comments for the post
    const comments = commentsByPostId[postId];

    // Find comment to update
    const comment = comments.find((comment) => comment.id === id);

    // Update comment
    comment.status = status;

    // Emit event
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        postId,
        status,
        content,
      },
    });
  }

  // Send response
  res.send({});
});

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});