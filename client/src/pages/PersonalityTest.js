import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DBTable from "../handlers/DatabaseHandler";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

function PersonalityTest() {
  const { t } = useTranslation();

  /*const questions = [
    {
      text: "How do you typically react to new situations?",
      answers: [
        "I embrace them eagerly",
        "I approach cautiously",
        "I prefer familiar situations",
        "I avoid them if possible",
      ],
    },
    {
      text: "When making decisions, you usually:",
      answers: [
        "Trust your intuition",
        "Analyze all options carefully",
        "Seek others' advice",
        "Go with proven solutions",
      ],
    },
    {
      text: "In group settings, you tend to:",
      answers: [
        "Lead the conversation",
        "Actively participate",
        "Listen and observe",
        "Stay in the background",
      ],
    },
    {
      text: "How do you prefer to spend your free time?",
      answers: [
        "Socializing with many people",
        "With a few close friends",
        "Pursuing solo hobbies",
        "Relaxing quietly alone",
      ],
    },
  ];*/

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const [questions, setQuestions] = useState([
    { //Level 1
      text: "Predict the best time to buy iPhone 16 in 2024 by watching a price-date graph of iPhone 15",
      answersWeighting: [1.5, 1.5, 1.5, 0, 0, 0]
    },
    {
      text: "Calculating 13*17 without the aid of any tool, including pen and paper",
      answersWeighting: [1.5, 1.5, 0, 0, 1.5, 0]
    },
    {
      text: "Watch weather forecast on TV and tell your grandmother the temparature trend next week",
      answersWeighting: [0, 1.5, 1.5, 1.5, 0, 1.5]
    },
    {
      text: "Help your friend to name her new pet hamster",
      answersWeighting: [0, 0, 0, 1.5, 0, 1.5]
    },
    {
      text: "Remind your friend that he is supposed to buy a notebook when you meet him tomorrow",
      answersWeighting: [0, 0, 0, 1.5, 1.5, 0]
    },
    { // New Level 1 questions
      text: "Memorize and recite a short poem you just read",
      answersWeighting: [0, 0, 0, 1.5, 1.5, 0]
    },
    {
      text: "Solve a simple Sudoku puzzle in a newspaper",
      answersWeighting: [1.5, 1.5, 0, 0, 0, 0]
    },
    {
      text: "Draw a simple map to show your friend how to get to your house",
      answersWeighting: [0, 0, 1.5, 1.5, 0, 0]
    },
    {
      text: "Create a short story about your favorite animal",
      answersWeighting: [0, 0, 0, 1.5, 0, 1.5]
    },
    { //Level 2
      text: "Solve ordinary math problems in your assignment",
      answersWeighting: [2.5, 2, 2.5, 0, 0, 2]
    },
    { // New Level 2 questions
      text: "Analyze a bar graph showing monthly sales data and identify trends",
      answersWeighting: [2.5, 2, 2.5, 0, 0, 2]
    },
    {
      text: "Write a persuasive essay about a topic you're passionate about",
      answersWeighting: [0, 2, 0, 2.5, 0, 2.5]
    },
    {
      text: "Memorize and explain the steps of a complex recipe",
      answersWeighting: [0, 0, 0, 2.5, 2.5, 0]
    },
    {
      text: "Design a simple board game with clear rules",
      answersWeighting: [0, 2.5, 2, 0, 0, 2.5]
    },
    { // Additional Level 2 questions
      text: "Solve a series of logic puzzles with increasing difficulty",
      answersWeighting: [2, 2.5, 0, 0, 2, 0]
    },
    {
      text: "Create a detailed mind map for a complex topic",
      answersWeighting: [0, 2, 2.5, 0, 0, 2.5]
    },
    { //Level 3
      text: "Try to solve most difficult maths problems in your assignment",
      answersWeighting: [3.5, 3, 3.5, 0, 0, 3]
    },
    { // New Level 3 questions
      text: "Interpret complex statistical data and draw meaningful conclusions",
      answersWeighting: [3.5, 3, 3.5, 0, 0, 3]
    },
    {
      text: "Create an original piece of music or art with a specific theme",
      answersWeighting: [0, 0, 3.5, 0, 0, 3.5]
    },
    {
      text: "Develop a detailed plan to solve a community problem",
      answersWeighting: [0, 3.5, 0, 3.5, 0, 3]
    },
    {
      text: "Memorize and perform a complex dance routine",
      answersWeighting: [0, 0, 3.5, 0, 3.5, 0]
    },
    { // Additional Level 3 questions
      text: "Design and implement a solution to optimize a complex process",
      answersWeighting: [3.5, 3.5, 0, 0, 0, 3]
    },
    {
      text: "Create a comprehensive analysis of a historical event's impact",
      answersWeighting: [0, 3.5, 0, 3.5, 3, 0]
    },
    { //Level 4
      text: "Try to understand (don't have to solve problems) basic calculus",
      answersWeighting: [4, 0, 0, 0, 0, 0]
    },
    {
      text: "Explain the most difficult maths problems to your friend and make him/her understand",
      answersWeighting: [4, 4, 0, 0, 0, 0]
    },
    {
      text: "Try to teach yourself maths that you will learn next year",
      answersWeighting: [4, 0, 4, 0, 0, 0]
    },
    {
      text: "Convince your mother about \"Taking a break every hour is better than non-stop learning\"",
      answersWeighting: [0, 4, 0, 0, 0, 0]
    },
    {
      text: "Criticize a doubtful news article you read on Google in front of your class",
      answersWeighting: [0, 4, 0, 4, 0, 0]
    },
    {
      text: "Find a solution that can stop your classroom air-con from frequently dripping",
      answersWeighting: [0, 4, 0, 0, 0, 4]
    },
    {
      text: "Write an article that can be praised by your teacher",
      answersWeighting: [0, 0, 0, 4, 0, 0]
    },
    {
      text: "Make a speech in school opening ceremony",
      answersWeighting: [0, 4, 0, 4, 4, 0]
    },
    {
      text: "Do a presentation in your class for 10 min about a cultural or historical story",
      answersWeighting: [0, 0, 0, 0, 4, 0]
    },
  ]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));

  const defaultanswers = [
    "Unable to do",
    "May do but uncomfortable",
    "Should be fine",
    "No problem in general",
    "Piece of cake"
  ]

  const userTable = new DBTable(
    "USER",
    "User_ID",
    {
      User_ID: "",
      First_Name: "",
      Last_Name: "",
      Nickname: "",
      Title: "",
      Gender: "",
      Email_Address: "",
      Tel: "",
      User_Role: "",
      direct_marketing: false,
      email_list: false,
      card_id: "",
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5]
    }
  );

  const handleNext = () => {
    if (currentQuestion < questions.length - 1 && answers[currentQuestion] !== null) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setError(null); // Reset error state
    // Tally up the scores!
    let ability_6dp = [1.5, 1.5, 1.5, 1.5, 1.5, 1.5];
    let ability_6dfc = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < questions.length; i++) {
      for (var j = 0; j < ability_6dp.length; j++) {
        if (questions[i].answersWeighting[j] <= ability_6dp[j] && ability_6dfc[j] < 2) {
          if (questions[i].answersWeighting[j] + answers[i] * 0.3 >= ability_6dp[j]) {
            ability_6dp[j] = questions[i].answersWeighting[j] + answers[i] * 0.3;
          } else if (questions[i].answersWeighting[j] != 0) { // Modified to skip calculation if the wieghting is 0 (Cole, 2025.05.07)
            ability_6dfc[j] = ability_6dfc[j] + 1;
          };
        }
      }
    }

    try {
      if (!currentUser || !currentUser.User_ID) {
        setError(t('errors.noUserDataFound'));
        return;
      }

      const currentUserData = {
        User_ID: currentUser.User_ID,
        ability_6d: ability_6dp,
        needs_recommendation_regeneration: true
      };

      const success = await userTable.handleWrite(currentUserData, false);

      if (!success) {
        navigate("/view-report");
      } else {
        setError(t('errors.failedToSaveData'));
      }
    } catch (error) {
      console.error("Network error:", error);
      setError(t('errors.networkError'));
    }
  };

  return (
    <div className="bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              }}
            ></div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-500 font-medium">
              Question {currentQuestion + 1} of {questions.length}
            </p>
            <h2 className="text-3xl font-bold text-gray-800 mt-4 font-montserrat">
              {questions[currentQuestion].text}
            </h2>
          </div>

          <div className="space-y-4">
            {defaultanswers.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg transition-colors duration-200 ${answers[currentQuestion] === index
                  ? "bg-blue-100 border border-blue-500 text-blue-700"
                  : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
              >
                {answer}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className={`px-6 py-2 rounded-lg ${currentQuestion === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              Previous
            </button>
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={answers[currentQuestion] === null}
                className={`px-6 py-2 rounded-lg ${answers[currentQuestion] === null
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
              >
                Submit
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={answers[currentQuestion] === null}
                className={`px-6 py-2 rounded-lg ${answers[currentQuestion] === null
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalityTest;