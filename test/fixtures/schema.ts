export default `
type Query {
  Todo: Todo
  Task: Task
  File: File
  Comment: Comment
}

type Todo {
  text: String
  done: Boolean
}

type Task {
  title: String
  description: String
  done: Boolean
}

type File {
  name: String
  mimeType: String
}

type Comment {
  text: String
}
`;
