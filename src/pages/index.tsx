import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Question {
  question: string;
  image?: string;
  image2?: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e?: string; // Make e optional
  };
  answer: ('a' | 'b' | 'c' | 'd' | 'e')[];
}

const App: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[][]>([]);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [mode, setMode] = useState<
    'normal' | 'show-answer' | 'instant-feedback'
  >('normal');
  const [examMode, setExamMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpToPage, setJumpToPage] = useState(1);
  const questionsPerPage = 20;

  const getRandomQuestions = (questions: Question[], num: number) => {
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
  };

  useEffect(() => {
    fetch('/quizData.json')
      .then((response) => response.json())
      .then((data) => {
        if (examMode) {
          setQuestions(getRandomQuestions(data, 60));
        } else {
          setQuestions(data);
        }
        const savedState = localStorage.getItem('quizState');
        if (savedState) {
          const { currentQuestionIndex, selectedOptions, score } =
            JSON.parse(savedState);
          setCurrentQuestionIndex(currentQuestionIndex);
          setSelectedOptions(selectedOptions);
          setScore(score);
        } else {
          setSelectedOptions(Array(data.length).fill(null));
        }
      });
  }, [examMode]);

  useEffect(() => {
    // Save quiz state to local storage
    if (questions.length > 0) {
      const quizState = {
        currentQuestionIndex,
        selectedOptions,
        score,
      };
      localStorage.setItem('quizState', JSON.stringify(quizState));
    }
  }, [currentQuestionIndex, selectedOptions, score, questions]);

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const option = e.target.value as 'a' | 'b' | 'c' | 'd' | 'e';
    const isSelected = e.target.checked;
    const newSelectedOptions = [...selectedOptions];
    if (!newSelectedOptions[currentQuestionIndex]) {
      newSelectedOptions[currentQuestionIndex] = [];
    }
    const currentSelections = [...newSelectedOptions[currentQuestionIndex]];
    if (isSelected) {
      currentSelections.push(option);
    } else {
      const index = currentSelections.indexOf(option);
      if (index > -1) {
        currentSelections.splice(index, 1);
      }
    }

    newSelectedOptions[currentQuestionIndex] = currentSelections;
    setSelectedOptions(newSelectedOptions);

    if (mode === 'instant-feedback') {
      handleCheckAnswer(currentSelections);
    }
  };

  const handleCheckAnswer = (selectedOption: string[] | null) => {
    const correctAnswers = questions[currentQuestionIndex].answer;

    // Ensure correctAnswers is always treated as an array
    const answersArray = Array.isArray(correctAnswers)
      ? correctAnswers
      : [correctAnswers];

    // Check if selectedOption is not null or undefined and has the same length as correctAnswers
    if (
      selectedOption &&
      selectedOption.length === answersArray.length &&
      selectedOption.every((option) =>
        answersArray.includes(option as 'a' | 'b' | 'c' | 'd' | 'e')
      )
    ) {
      setFeedback('Correct!');
    } else {
      setFeedback('Incorrect!');
    }
  };

  const handleNextQuestion = () => {
    const selectedOption = selectedOptions[currentQuestionIndex];
    const correctAnswers = questions[currentQuestionIndex].answer;

    if (
      selectedOption &&
      selectedOption.length === correctAnswers.length &&
      selectedOption.every((option) =>
        correctAnswers.includes(option as 'a' | 'b' | 'c' | 'd' | 'e')
      )
    ) {
      setScore(score + 1);
    }

    setFeedback(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsQuizFinished(true);
      localStorage.removeItem('quizState'); // Clear state when quiz is finished
    }
  };

  const handlePreviousQuestion = () => {
    setFeedback(null);
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleSkipToQuestion = (index: number) => {
    setFeedback(null);
    setCurrentQuestionIndex(index);
  };

  const toggleMode = (
    selectedMode: 'normal' | 'show-answer' | 'instant-feedback'
  ) => {
    if (examMode) {
      return; // Don't allow mode changes in exam mode
    }
    setMode(selectedMode);
  };

  const handleExamModeToggle = () => {
    const newExamMode = !examMode;
    setExamMode(newExamMode);
    if (newExamMode) {
      setMode('normal'); // Always reset to normal mode when entering exam mode
    }
  };

  const handleJumpToQuestion = (questionNumber: number) => {
    if (questionNumber >= 1 && questionNumber <= questions.length) {
      setCurrentQuestionIndex(questionNumber - 1);
      setShowJumpModal(false);
      setFeedback(null);
    }
  };

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentPage = Math.floor(currentQuestionIndex / questionsPerPage) + 1;

  const handleResetQuiz = () => {
    if (window.confirm('Are you sure you want to reset the quiz?')) {
      setCurrentQuestionIndex(0);
      setSelectedOptions(Array(examMode ? 60 : questions.length).fill(null));
      setScore(0);
      setIsQuizFinished(false);
      setMode('normal');
      setFeedback(null);
      localStorage.removeItem('quizState');
      // Refetch questions for the selected mode
      fetch('/quizData.json')
        .then((response) => response.json())
        .then((data) => {
          if (examMode) {
            setQuestions(getRandomQuestions(data, 60));
          } else {
            setQuestions(data);
          }
        });
    }
  };

  if (questions.length === 0) {
    return (
      <div className='w-screen h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500'></div>
          <div className='text-xl text-gray-600 font-semibold'>Loading questions...</div>
        </div>
      </div>
    );
  }

  const handleFinishQuiz = () => {
    if (window.confirm('Are you sure you want to finish the quiz?')) {
      setIsQuizFinished(true);
      localStorage.removeItem('quizState'); // Clear state when quiz is finished
    }
  };

  const handleBack = () => {
    setIsQuizFinished(false);
  };

  if (isQuizFinished) {
    const percentage = (score / questions.length) * 100;
    return (
      <div className='w-screen h-screen font-body flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full mx-4'>
          <div className='text-center mb-8'>
            <h1 className='text-5xl font-bold text-gray-800 mb-2'>Quiz Complete! 🎉</h1>
            <p className='text-gray-600'>Here&apos;s how you performed</p>
          </div>
          <div className='flex items-center justify-center mb-8'>
            <div className='relative'>
              <svg className='transform -rotate-90 w-48 h-48'>
                <circle
                  cx='96'
                  cy='96'
                  r='88'
                  stroke='#e5e7eb'
                  strokeWidth='12'
                  fill='none'
                />
                <circle
                  cx='96'
                  cy='96'
                  r='88'
                  stroke={percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth='12'
                  fill='none'
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - percentage / 100)}`}
                  className='transition-all duration-1000 ease-out'
                  strokeLinecap='round'
                />
              </svg>
              <div className='absolute inset-0 flex flex-col items-center justify-center'>
                <div className='text-5xl font-bold text-gray-800'>{score}</div>
                <div className='text-gray-400 text-sm'>out of {questions.length}</div>
                <div className={`text-2xl font-semibold mt-2 ${
                  percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>{percentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <div className='flex justify-center space-x-4'>
            <button
              onClick={handleResetQuiz}
              className='bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 transform font-semibold'
            >
              🔄 Retry Quiz
            </button>
            <button
              className='bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold'
              onClick={handleBack}
              disabled={mode === 'instant-feedback'}
            >
              📝 Review Answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure currentQuestion is defined before accessing its properties
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 font-body'>
      {/* Jump to Question Modal */}
      {showJumpModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' onClick={() => setShowJumpModal(false)}>
          <div className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-800'>Jump to Question</h2>
              <button onClick={() => setShowJumpModal(false)} className='text-gray-400 hover:text-gray-600 text-2xl'>
                ×
              </button>
            </div>
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Enter question number (1-{questions.length})
              </label>
              <input
                type='number'
                min='1'
                max={questions.length}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(parseInt(e.target.value) || 1)}
                className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
                placeholder='Question number'
                autoFocus
              />
            </div>
            <button
              onClick={() => handleJumpToQuestion(jumpToPage)}
              className='w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 transform font-semibold'
            >
              Go to Question
            </button>
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 py-6'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-lg p-6 mb-6'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center space-x-4'>
              <div className='bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-md font-semibold'>
                Question {currentQuestionIndex + 1} / {questions.length}
              </div>
              {examMode && (
                <div className='bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl shadow-md text-sm font-semibold animate-pulse'>
                  🎯 Exam Mode
                </div>
              )}
            </div>
            <div className='lg:flex gap-3 hidden flex-wrap'>
              <button
                onClick={() => toggleMode('show-answer')}
                disabled={examMode}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform ${
                  mode === 'show-answer'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                👁️ Show Answer
              </button>
              <button
                onClick={() => toggleMode('normal')}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 transform ${
                  mode === 'normal' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📝 Normal
              </button>
              <button
                onClick={() => toggleMode('instant-feedback')}
                disabled={examMode}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform ${
                  mode === 'instant-feedback'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚡ Instant Feedback
              </button>
              <button
                onClick={handleExamModeToggle}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 transform ${
                  examMode
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎯 Exam Mode
              </button>
            </div>
            <button
              onClick={handleResetQuiz}
              disabled={mode === 'show-answer'}
              className='bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:scale-105 transform font-semibold'
            >
              🔄 Reset
            </button>
          </div>
        </div>
        {/* Question Card */}
        <div className='bg-white rounded-2xl shadow-lg p-8 mb-6'>
          <div className='text-md lg:text-2xl font-semibold text-gray-800 mb-6 leading-relaxed'>
            {currentQuestion && (
              <>
                <span className='text-blue-600'>{currentQuestionIndex + 1}.</span> {currentQuestion.question}
              </>
            )}
          </div>
          <div className='mb-6'>
            {currentQuestion && currentQuestion?.image && (
              <div className='rounded-xl overflow-hidden shadow-md mb-4 hover:shadow-xl transition-shadow duration-300'>
                <Image
                  src={currentQuestion.image}
                  alt='quiz'
                  className='mx-auto'
                  width={450}
                  height={300}
                />
              </div>
            )}
            {currentQuestion && currentQuestion?.image2 && (
              <div className='rounded-xl overflow-hidden shadow-md mb-4 hover:shadow-xl transition-shadow duration-300'>
                <Image
                  src={currentQuestion.image2}
                  alt='quiz2'
                  className='mx-auto'
                  width={450}
                  height={300}
                />
              </div>
            )}
          </div>
          <div className='mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center max-w-fit rounded-lg font-semibold text-gray-700'>
            📋 Options
          </div>
          <div className='flex flex-col space-y-3'>
            {currentQuestion &&
              Object.keys(currentQuestion.options).map((key, idx) => {
                const isCorrect = currentQuestion.answer.includes(key as 'a' | 'b' | 'c' | 'd' | 'e');
                const isSelected = (selectedOptions[currentQuestionIndex] || []).includes(key as 'a' | 'b' | 'c' | 'd' | 'e');
                const showAsCorrect = mode === 'show-answer' && isCorrect;
                const showFeedback = mode === 'instant-feedback' && isSelected;

                return (
                  <label
                    key={key}
                    className={`text-base px-5 py-4 rounded-xl cursor-pointer transition-all duration-300 border-2 hover:scale-[1.02] transform ${
                      showAsCorrect
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-lg'
                        : showFeedback
                        ? isCorrect
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-lg'
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 shadow-lg'
                        : isSelected
                        ? 'bg-blue-50 border-blue-400 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <input
                      type='checkbox'
                      name='option'
                      value={key}
                      className='mr-3 w-5 h-5 accent-blue-600'
                      checked={
                        mode === 'show-answer'
                          ? isCorrect
                          : isSelected
                      }
                      onChange={handleOptionChange}
                      disabled={mode === 'show-answer'}
                    />
                    <span className='font-medium'>{key.toUpperCase()}.</span>{' '}
                    {
                      currentQuestion.options[
                        key as keyof typeof currentQuestion.options
                      ]
                    }
                  </label>
                );
              })}
          </div>
        </div>
        {/* Navigation */}
        <div className='bg-white rounded-2xl shadow-lg p-6 mb-6'>
          <div className='flex flex-wrap justify-between items-center gap-4'>
            <div className='flex space-x-3'>
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className='px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 transform font-semibold'
              >
                ← Previous
              </button>
              <button
                onClick={handleNextQuestion}
                className='px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 transform font-semibold'
              >
                Next →
              </button>
            </div>
            <div className='flex space-x-3'>
              <button
                onClick={() => setShowJumpModal(true)}
                className='px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 transform font-semibold'
              >
                🔍 Jump to Question
              </button>
              <button
                onClick={handleFinishQuiz}
                disabled={mode === 'show-answer'}
                className='px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 transform font-semibold'
              >
                ✓ Finish Quiz
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Mode Buttons */}
        <div className='lg:hidden bg-white rounded-2xl shadow-lg p-4 mb-6'>
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={() => toggleMode('show-answer')}
              disabled={examMode}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'show-answer' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700'
              }`}
            >
              👁️ Show Answer
            </button>
            <button
              onClick={() => toggleMode('normal')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-all duration-300 ${
                mode === 'normal' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700'
              }`}
            >
              📝 Normal
            </button>
            <button
              onClick={() => toggleMode('instant-feedback')}
              disabled={examMode}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'instant-feedback'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              ⚡ Instant
            </button>
            <button
              onClick={handleExamModeToggle}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-all duration-300 ${
                examMode
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              🎯 Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
