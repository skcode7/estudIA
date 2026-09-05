# Modelo de datos MVP

## Entidades principales

```text
Subject
  |
  +--> Topic
         |
         +--> Material
         |
         +--> Question
         |
         +--> Quiz
                |
                +--> QuizAttempt
                       |
                       +--> Answer

Topic
  |
  +--> TopicProgress
```

## Entidades

### Subject
- id
- name
- description opcional
- timestamps

### Topic
- id
- subjectId
- name
- description opcional
- timestamps

### Material
- id
- topicId
- type
- title
- content opcional
- storageKey opcional
- processingStatus
- processingError opcional
- timestamps

### Question
- id
- topicId
- type
- statement
- explanation
- difficulty
- sourceMaterialId opcional
- timestamps

### QuestionOption
- id
- questionId
- text
- isCorrect

### Quiz
- id
- topicId
- title
- timestamps

### QuizQuestion
- quizId
- questionId
- order

### QuizAttempt
- id
- quizId
- startedAt
- completedAt
- score

### Answer
- id
- attemptId
- questionId
- selectedOptionId opcional
- answerText opcional
- isCorrect
- answeredAt

### TopicProgress
- id
- topicId
- attempts
- correctAnswers
- totalAnswers
- masteryScore
- updatedAt

## Notas
No crear entidades de:
- Subscription
- License
- Plan
- Billing
- Role
- AuthSession

hasta que exista un requisito real.
