import React, { useState, useEffect, useMemo } from 'react';
// Importing Recharts components for data visualization
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

// --- Mock Data ---

const initialUsers = {
  admin: { name: 'Admin User', role: 'Admin' },
  instructor: { name: 'Dr. Eleanor Vance', role: 'Instructor' },
  student: { name: 'Alex Johnson', role: 'Student' },
  creator: { name: 'Casey Lee', role: 'Content Creator' },
};

// Course structure with mock student and assignment data
// NOTE: Added submissionText and submittedBy fields to the assignments for grading
const initialCourses = [
  { 
    id: 1, 
    title: 'Introduction to Quantum Physics', 
    instructor: 'Dr. Eleanor Vance', 
    description: 'Explore the fundamental principles of quantum mechanics.', 
    status: 'Published', 
    students: ['Alex Johnson'], 
    assignments: [
      // This is the assignment Alex Johnson will submit
      { id: 1, title: 'Problem Set 1', submitted: false, submissionText: null, submittedBy: null, grade: null, feedback: null, dueDate: '2025-11-15', type: 'Homework', question: 'Derive the time-independent Schrödinger equation for a particle in a one-dimensional box, including boundary conditions.' }
    ],
    content: [ // Mock Content structure
      { id: 'q1', title: 'Introduction to Wave-Particle Duality', type: 'Lecture', completedBy: ['Alex Johnson'] },
      { id: 'q2', title: 'The Schrödinger Equation', type: 'Lecture', completedBy: ['Alex Johnson'] },
      { id: 'q3', title: 'Heisenberg Uncertainty Principle', type: 'Lecture', completedBy: [] },
      { id: 'q4', title: 'Quiz: Fundamentals', type: 'Quiz', completedBy: [] },
      { id: 'q5', title: 'Module: Quantum Field Theory (Advanced)', type: 'Lecture', completedBy: [] },
    ]
  },
  { 
    id: 2, 
    title: 'Modern Web Development', 
    instructor: 'Dr. Ben Carter', 
    description: 'Master the latest technologies for building web applications.', 
    status: 'Draft', 
    students: [], 
    assignments: [],
    content: [] 
  },
  { 
    id: 3, 
    title: 'The History of Ancient Rome', 
    instructor: 'Dr. Eleanor Vance', 
    description: 'A journey through the rise and fall of the Roman Empire.', 
    status: 'Published', 
    students: ['Alex Johnson'], 
    assignments: [
      // This is an already graded assignment
      { id: 1, title: 'Essay on Roman Architecture', submitted: true, submissionText: 'The Roman use of concrete transformed their architecture...', submittedBy: 'Alex Johnson', grade: 'A-', feedback: 'Excellent analysis of the Pantheon and Colosseum.', dueDate: '2025-10-20', type: 'Essay', question: 'Analyze the impact of concrete on Roman architectural innovations, citing three specific examples. (Submitted)' }
    ],
    content: [ // Mock Content structure
      { id: 'r1', title: 'Module 1: The Founding of Rome', type: 'Lecture', completedBy: ['Alex Johnson'] },
      { id: 'r2', title: 'Module 2: The Roman Republic', type: 'Lecture', completedBy: ['Alex Johnson'] },
      { id: 'r3', title: 'Module 3: Rise of the Empire', type: 'Lecture', completedBy: ['Alex Johnson'] },
      { id: 'r4', title: 'Quiz: Republic vs Empire', type: 'Quiz', completedBy: ['Alex Johnson'] },
      { id: 'r5', title: 'Module 5: The Fall of the West', type: 'Lecture', completedBy: [] },
    ]
  },
];

// Data for Instructor's performance chart
const courseProgressData = [
  { name: 'Quantum Physics', progress: 40, pv: 2400, amt: 2400 }, 
  { name: 'Web Development', progress: 30, pv: 1398, amt: 2210 },
  { name: 'Ancient Rome', progress: 80, pv: 9800, amt: 2290 }, 
];

// Data for Student's enrollment pie chart
const enrollmentData = [
    { name: 'Enrolled', value: 3 },
    { name: 'Available', value: 5 },
];
const COLORS = ['#4F46E5', '#A5B4FC']; // Indigo colors for charts

// --- Helper Components ---

const Card = ({ title, children, className }) => (
  // FIX: Using backticks inside curly braces for template literal
  <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 ${className}`}>
    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>
    <div>{children}</div>
  </div>
);

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700' }) => (
  // FIX: Using backticks inside curly braces for template literal
  <button onClick={onClick} className={`text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out shadow-md text-sm ${className}`}>
    {children}
  </button>
);

const Modal = ({ show, onClose, title, children, className = 'max-w-lg' }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            {/* This one was already correct */}
            <div className={`bg-white p-8 rounded-xl shadow-2xl w-full ${className} transform transition-all duration-300 scale-100 border-t-4 border-indigo-600`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-indigo-700">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- GRADE ASSIGNMENT MODAL (New Component) ---

const GradeAssignmentModal = ({ assignment, onClose, onGrade }) => {
    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isGrading, setIsGrading] = useState(false); // New state for AI loading

    // Constants for Gemini API
    const apiKey = ""; // Leave as empty string
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // Function to call Gemini API for grade suggestion
    const handleAIGradeSuggestion = async () => {
        setIsGrading(true);
        setFeedback('AI is analyzing the submission...'); // Provide immediate feedback
        setGrade('...');

        const prompt = `You are a Teaching Assistant for a university course. Your task is to review a student submission against the assignment question and provide a structured grade and feedback.

Assignment Question: "${assignment.question}"
Student Submission: "${assignment.submissionText}"

Provide a grade (A+, B-, 85%, etc.) and a short, constructive feedback message (2-3 sentences) based purely on the submission quality. The grade should be a single string, and the feedback should be a single string.`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        grade: { type: "STRING", description: "The final suggested grade, e.g., 'A-'" },
                        feedback: { type: "STRING", description: "Constructive feedback for the student (2-3 sentences)." }
                    },
                    required: ["grade", "feedback"]
                }
            }
        };

        try {
            // Implement exponential backoff for robustness
            let response = null;
            for (let i = 0; i < 3; i++) {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) break;

                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            if (!response || !response.ok) {
                throw new Error("API call failed after retries.");
            }

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (jsonText) {
                const parsedJson = JSON.parse(jsonText);
                setGrade(parsedJson.grade || 'N/A');
                setFeedback(parsedJson.feedback || 'AI could not generate detailed feedback.');
            } else {
                setFeedback('AI response format error. Could not parse.');
                setGrade('N/A');
            }

        } catch (error) {
            console.error("Gemini API Error:", error);
            setFeedback(`Error connecting to AI assistant: ${error.message}`);
            setGrade('N/A');
        } finally {
            setIsGrading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!grade.trim()) {
            console.error("Validation: Please enter a grade.");
            return;
        }
        onGrade(assignment.courseId, assignment.id, grade, feedback);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-sm font-medium text-gray-700">Course: <span className="font-semibold text-indigo-700">{assignment.courseTitle}</span></p>
                <p className="text-sm font-medium text-gray-700">Student: <span className="font-semibold text-indigo-700">{assignment.studentName}</span></p>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Assignment Question:</h3>
                <div className="p-4 bg-gray-100 rounded-lg text-gray-700 italic border-l-4 border-gray-300 max-h-48 overflow-y-auto">
                    {assignment.question || 'No question details provided.'}
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-red-700 mb-3">Student Submission:</h3>
                <div className="p-4 bg-gray-100 rounded-lg text-gray-700 italic border-l-4 border-red-300 max-h-48 overflow-y-auto">
                    {assignment.submissionText || 'No submission text provided.'}
                </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">Record Grade</h3>
            
            {/* AI Assistant Button */}
            <div className="flex justify-end mb-4">
                <Button 
                    type="button" 
                    onClick={handleAIGradeSuggestion} 
                    disabled={isGrading || !assignment.submissionText}
                    className={`bg-indigo-600 hover:bg-indigo-700 text-xs py-2 px-3 ${isGrading || !assignment.submissionText ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isGrading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing Submission...
                        </>
                    ) : 'Get AI Grade Suggestion'}
                </Button>
            </div>

            {/* Grade Input */}
            <div>
                <label className="block text-gray-700 font-medium mb-1">Final Grade (e.g., A, B+, 95%):</label>
                <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter Grade"
                />
            </div>
            
            {/* Feedback Input */}
            <div>
                <label className="block text-gray-700 font-medium mb-1">Feedback to Student (Optional):</label>
                <textarea
                    rows="4"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 resize-y"
                    placeholder="Provide constructive feedback here..."
                />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <Button onClick={onClose} type="button" className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
                <button
                    type="submit"
                    className="py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition"
                >
                    Submit Grade
                </button>
            </div>
        </form>
    );
};


// --- COURSE CONTENT VIEWER COMPONENT (Unchanged) ---

const CourseContentViewer = ({ course, studentName, onClose }) => {
    // Determine completion status for the current student
    const contentWithProgress = course.content.map(item => ({
        ...item,
        isCompleted: item.completedBy.includes(studentName),
    }));

    // Calculate overall course progress (for display consistency)
    const completedCount = contentWithProgress.filter(item => item.isCompleted).length;
    const totalCount = contentWithProgress.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Find the first non-completed item to highlight "Continue" button
    const nextModule = contentWithProgress.find(item => !item.isCompleted);

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-lg font-bold text-indigo-800">{course.title}</p>
                <p className="text-sm text-gray-600">Instructor: {course.instructor}</p>
            </div>
            
            <div className="flex items-center space-x-4">
                <h3 className="text-xl font-bold text-gray-800">Your Progress</h3>
                <div className="w-48 bg-gray-200 rounded-full h-4">
                    <div 
                        className="bg-indigo-600 h-4 rounded-full transition-all duration-700" 
                        style={{width: `${progressPercentage}%`}}
                    ></div>
                </div>
                <span className="font-extrabold text-indigo-700">{progressPercentage}%</span>
            </div>

            {nextModule && (
                <div className="p-4 bg-green-100 border-l-4 border-green-500 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-green-800">Next Up:</p>
                        <p className="font-bold text-green-900">{nextModule.title}</p>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">
                        Continue Learning
                    </Button>
                </div>
            )}

            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Module Breakdown</h3>
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {contentWithProgress.map((item, index) => (
                    <li 
                        key={item.id} 
                        // FIX: Using backticks inside curly braces for template literal
                        className={`flex justify-between items-center p-3 rounded-lg border transition ${
                            item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <div>
                            <p className="font-semibold text-gray-800">{index + 1}. {item.title}</p>
                            <p className="text-xs text-gray-500">{item.type}</p>
                        </div>
                        {/* FIX: Using backticks inside curly braces for template literal */}
                        <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                            item.isCompleted ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'
                        }`}>
                            {item.isCompleted ? 'DONE' : 'TO DO'}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="text-right pt-4">
                <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Close Viewer</Button>
            </div>
        </div>
    );
};


// --- Assignment Viewer/Submission Component (Unchanged) ---

const AssignmentViewer = ({ assignment, onClose, onSubmit }) => {
    const [submissionText, setSubmissionText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // NOTE: alert() replaced with console.log as per rules for custom modal implementation.
        if (submissionText.trim() === '') {
            console.log("Validation: Please enter your submission before continuing.");
            return;
        }
        onSubmit(assignment.id, submissionText);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-sm font-medium text-gray-700">Course: <span className="font-semibold text-indigo-700">{assignment.courseTitle}</span></p>
                <p className="text-sm font-medium text-gray-700">Type: <span className="font-semibold">{assignment.type || 'Assignment'}</span></p>
                <p className="text-sm font-medium text-gray-700">Due Date: <span className="font-semibold text-red-600">{assignment.dueDate || 'N/A'}</span></p>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Assignment Question</h3>
                <p className="p-4 bg-gray-100 rounded-lg text-gray-700 italic border-l-4 border-gray-300">
                    {assignment.question || 'No question details provided.'}
                </p>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Your Submission</h3>
                <textarea
                    rows="8"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Type or paste your response here... (e.g., A submission for the Problem Set 1 question)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    required
                />
            </div>

            <div className="flex justify-end space-x-3">
                <Button onClick={onClose} type="button" className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
                <button
                    type="submit"
                    className="py-2 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition"
                >
                    Submit Assignment
                </button>
            </div>
        </form>
    );
};


// --- LOGIN SCREEN COMPONENT (Unchanged) ---

const LoginScreen = ({ roles, onLogin, error }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(roles[0]); // Default to Admin

    const roleDescription = {
        Admin: "Manages platform settings, user roles, and course content. (Try Name: 'Admin User')",
        Instructor: "Creates/manages courses, grades assignments, and interacts with students. (Try Name: 'Dr. Eleanor Vance')",
        ContentCreator: "Develops course materials and ensures educational quality. (Try Name: 'Casey Lee')",
        Student: "Enrolls in courses, submits assignments, and tracks progress. (Try Name: 'Alex Johnson')",
    };

    const handleLoginClick = (e) => {
        e.preventDefault();
        // Password is not used for mock auth but is passed to satisfy the user's request for the field
        onLogin(name, selectedRole, password); 
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border-t-8 border-indigo-600">
                <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-6">
                    LMS Login
                </h2>
                <form onSubmit={handleLoginClick} className="space-y-6">
                    
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg border border-red-300">
                            {error}
                        </div>
                    )}

                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter exact user name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Password Input (Mock) */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password (Ignored for Mock Auth)
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Role Select */}
                    <div>
                        <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Select Role
                        </label>
                        <select
                            id="role-select"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {roles.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Role Description */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="font-medium text-indigo-700">Selected Role Summary:</p>
                        <p className="text-sm text-gray-600 mt-1">{roleDescription[selectedRole]}</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 transform hover:scale-[1.005]"
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- Admin Dashboard (Unchanged) ---

const AdminDashboard = ({ currentUser, courses, setCourses }) => { // Updated props
  // Mock State for Admin
  const [users] = useState([
    { id: 1, name: 'Dr. Eleanor Vance', role: 'Instructor' },
    { id: 2, name: 'Alex Johnson', role: 'Student' },
    { id: 3, name: 'Casey Lee', role: 'Content Creator' },
    { id: 4, name: 'Admin User', role: 'Admin' },
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const roles = ['Student', 'Instructor', 'Content Creator', 'Admin'];

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-extrabold text-indigo-700">Admin Dashboard</h2>
      <p className="text-gray-600 border-l-4 border-indigo-400 pl-3 italic">Welcome, {currentUser.name}. Manage users, courses, and platform settings.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-indigo-100 p-6 rounded-xl shadow-md text-center border-b-4 border-indigo-500">
              <h4 className="text-lg font-semibold text-indigo-800">Total Users</h4>
              <p className="text-5xl font-extrabold text-indigo-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-green-100 p-6 rounded-xl shadow-md text-center border-b-4 border-green-500">
              <h4 className="text-lg font-semibold text-green-800">Total Courses</h4>
              <p className="text-5xl font-extrabold text-green-900 mt-1">{courses.length}</p>
          </div>
           <div className="bg-yellow-100 p-6 rounded-xl shadow-md text-center border-b-4 border-yellow-500">
              <h4 className="text-lg font-semibold text-yellow-800">Published Courses</h4>
              <p className="text-5xl font-extrabold text-yellow-900 mt-1">{courses.filter(c => c.status === 'Published').length}</p>
          </div>
      </div>

      <Card title="User Management">
        <div className="flex justify-end mb-4">
            <Button onClick={() => setShowUserModal(true)} className="bg-indigo-600 hover:bg-indigo-700">Add New User</Button>
        </div>
        <ul className="space-y-3">
          {users.map(user => (
            <li key={user.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 hover:shadow-sm transition">
              <div>
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-sm text-indigo-500 font-medium">{user.role}</p>
              </div>
              <div className="space-x-2">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-xs">Edit Role</Button>
                <Button className="bg-red-500 hover:bg-red-600 text-xs">Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      
        <Modal show={showUserModal} onClose={() => setShowUserModal(false)} title="Add New User">
          <form className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium">Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="John Doe"/>
            </div>
            <div>
              <label className="block text-gray-700 font-medium">Email</label>
              <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="john.doe@example.com"/>
            </div>
            <div>
              <label className="block text-gray-700 font-medium">Role</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-indigo-500 focus:border-indigo-500">
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="pt-4 text-right">
              <Button onClick={(e) => { e.preventDefault(); setShowUserModal(false); }} className="bg-green-600 hover:bg-green-700">Add User</Button>
            </div>
          </form>
        </Modal>

      <Card title="Platform Settings (Simulated)">
        <p className="text-gray-500">Platform-wide settings and configuration options would be displayed here (e.g., payment gateways, theme settings, API keys).</p>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold">Current System Status: <span className="text-green-600">Operational</span></h4>
            <p className="text-sm text-gray-600">Next maintenance window: 2026-01-01</p>
        </div>
      </Card>
    </div>
  );
};

// --- Instructor Dashboard (Updated) ---

const InstructorDashboard = ({ currentUser, courses, setCourses }) => {
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedAssignmentToGrade, setSelectedAssignmentToGrade] = useState(null);

  // Filter courses relevant to instructor (Dr. Eleanor Vance)
  const instructorCourses = courses.filter(c => c.instructor === currentUser.name || c.instructor === 'Dr. Eleanor Vance');
  
  // Find assignments that have been submitted but NOT graded (grade is null) and have submission text
  const assignmentsAwaitingReview = instructorCourses.flatMap(course => 
    course.assignments.filter(a => a.submitted && !a.grade && a.submissionText).map(a => ({
        ...a, 
        courseId: course.id, 
        courseTitle: course.title,
        studentName: a.submittedBy || 'Alex Johnson' // Fallback to mock student name if submittedBy is missing
    }))
  );

  const handleGradeSubmission = (courseId, assignmentId, grade, feedback) => {
      const updatedCourses = courses.map(course => {
          if (course.id !== courseId) return course;

          const updatedAssignments = course.assignments.map(a => {
              if (a.id === assignmentId) {
                  return { ...a, grade, feedback };
              }
              return a;
          });
          return { ...course, assignments: updatedAssignments };
      });

      setCourses(updatedCourses);
      setSelectedAssignmentToGrade(null); // Close modal
      console.log(`Assignment ${assignmentId} in course ${courseId} graded: ${grade}`);
  };


  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-extrabold text-indigo-700">Instructor Dashboard</h2>
      <p className="text-gray-600 border-l-4 border-indigo-400 pl-3 italic">Welcome, {currentUser.name}. Manage your courses and interact with students.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-100 p-6 rounded-xl shadow-md text-center border-b-4 border-red-500">
            <h4 className="text-lg font-semibold text-red-800">Review Required</h4>
            <p className="text-5xl font-extrabold text-red-900 mt-1">{assignmentsAwaitingReview.length}</p>
        </div>
        <div className="bg-blue-100 p-6 rounded-xl shadow-md text-center border-b-4 border-blue-500">
            <h4 className="text-lg font-semibold text-blue-800">Total Students</h4>
            <p className="text-5xl font-extrabold text-blue-900 mt-1">54</p> {/* Mock data */}
        </div>
        <div className="bg-yellow-100 p-6 rounded-xl shadow-md text-center border-b-4 border-yellow-500">
            <h4 className="text-lg font-semibold text-yellow-800">Draft Courses</h4>
            <p className="text-5xl font-extrabold text-yellow-900 mt-1">{instructorCourses.filter(c => c.status === 'Draft').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card title="My Courses" className="lg:col-span-2">
            <div className="flex justify-end mb-4">
                <Button onClick={() => setShowCourseModal(true)} className="bg-indigo-600 hover:bg-indigo-700">Create New Course</Button>
            </div>
            <ul className="space-y-3">
                {instructorCourses.map(course => (
                    <li key={course.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition border border-gray-200">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-gray-800">{course.title}</p>
                            {/* FIX: Using backticks inside curly braces for template literal */}
                            <span className={`px-3 py-1 text-xs rounded-full font-semibold ${course.status === 'Published' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                {course.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description}</p>
                        <div className="mt-3 text-right">
                            <Button className="bg-gray-500 hover:bg-gray-600 text-xs">Manage Content</Button>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
        <Card title="Average Student Progress" className="lg:col-span-3">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseProgressData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" stroke="#333" />
                        <YAxis stroke="#333" domain={[0, 100]} label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          cursor={{ fill: '#f0f4ff' }}
                          formatter={(value, name) => [`${value}%`, name]}
                        />
                        <Bar dataKey="progress" fill="#4F46E5" name="Average Progress" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>
      
      <Card title="Assignments Awaiting Review">
          {assignmentsAwaitingReview.length > 0 ? (
              <ul className="space-y-3">
                  {assignmentsAwaitingReview.map((a, index) => (
                      <li key={`${a.courseId}-${a.id}`} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-200">
                          <div>
                              <p className="font-semibold text-gray-800">{a.title}</p>
                              <p className="text-sm text-gray-600">Course: {a.courseTitle} | Student: {a.studentName}</p>
                          </div>
                          <Button 
                            className="bg-red-600 hover:bg-red-700 text-xs"
                            onClick={() => setSelectedAssignmentToGrade(a)}
                          >
                            Review Now
                          </Button>
                      </li>
                  ))}
              </ul>
          ) : (
              <p className="text-green-600 font-medium">No assignments currently require review. Great job!</p>
          )}
      </Card>


      <Modal show={showCourseModal} onClose={() => setShowCourseModal(false)} title="Quick Course Creation">
          <form className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium">Course Title</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Advanced Calculus"/>
            </div>
            <div>
              <label className="block text-gray-700 font-medium">Description</label>
              <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows="4" placeholder="A brief summary of the course..."></textarea>
            </div>
            <div className="pt-4 text-right space-x-2">
                <Button onClick={(e) => { e.preventDefault(); setShowCourseModal(false); }} className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
                <Button onClick={(e) => { e.preventDefault(); setShowCourseModal(false); }} className="bg-green-600 hover:bg-green-700">Save as Draft</Button>
            </div>
          </form>
      </Modal>

      <Modal 
        show={!!selectedAssignmentToGrade} 
        onClose={() => setSelectedAssignmentToGrade(null)} 
        title={`Grade: ${selectedAssignmentToGrade?.title || ''}`}
        className="max-w-3xl"
      >
        {selectedAssignmentToGrade && (
            <GradeAssignmentModal
                assignment={selectedAssignmentToGrade}
                onClose={() => setSelectedAssignmentToGrade(null)}
                onGrade={handleGradeSubmission}
            />
        )}
    </Modal>
    </div>
  );
};

// --- Student Dashboard (Updated Submission Logic) ---

const StudentDashboard = ({ currentUser, courses, setCourses }) => {
  const studentName = currentUser.name;
  // StudentDashboard now uses courses/setCourses from App
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState(null);
  const [selectedCourseForView, setSelectedCourseForView] = useState(null); 

  const enrolledCourses = courses.filter(c => c.students.includes(studentName) && c.status === 'Published');
  
  // Flatten assignments and filter to the current student's status
  const allAssignments = enrolledCourses.flatMap(course => 
    course.assignments.map(a => ({
        ...a, 
        courseId: course.id, // Added for submission tracking
        courseTitle: course.title,
        isCompleted: a.submitted && a.grade, // Completed means submitted AND graded
        isSubmitted: a.submitted, // Submitted means just turned in
        grade: a.grade || 'N/A',
        feedback: a.feedback || 'Awaiting Grade'
    }))
  );

  const upcomingAssignments = allAssignments.filter(a => !a.isSubmitted);
  const completedAssignments = allAssignments.filter(a => a.isSubmitted);


  // Function to simulate submission - NOW STORES submissionText AND submittedBy
  const handleSubmitAssignment = (assignmentId, submissionText) => {
    
    // Find the course and assignment to mark it as submitted
    const updatedCourses = courses.map(course => {
        const assignmentIndex = course.assignments.findIndex(a => a.id === assignmentId && a.submitted === false);
        
        // This is a naive way to find the assignment since the courseId is not passed easily from the modal. 
        // We'll use the selectedAssignmentForView object to get the courseId.
        if (course.id !== selectedAssignmentForView.courseId) return course;

        if (assignmentIndex !== -1) {
            const updatedAssignments = [...course.assignments];
            // Mark as submitted and store key data for instructor
            updatedAssignments[assignmentIndex] = { 
                ...updatedAssignments[assignmentIndex], 
                submitted: true,
                submissionText: submissionText,
                submittedBy: currentUser.name // Store who submitted it
            };
            return { ...course, assignments: updatedAssignments };
        }
        return course;
    });

    setCourses(updatedCourses); // Update central state
    setSelectedAssignmentForView(null); // Close the modal
    console.log(`Assignment ${assignmentId} submitted by ${studentName}. Instructor can now grade it.`);
  };


  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-extrabold text-indigo-700">Student Dashboard</h2>
      <p className="text-gray-600 border-l-4 border-indigo-400 pl-3 italic">Welcome, {currentUser.name}. Continue your learning journey.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="My Courses" className="md:col-span-2">
            <ul className="space-y-4">
              {enrolledCourses.map(course => {
                  const progressItem = courseProgressData.find(p => course.title.includes(p.name.split(' ')[0])); // Simplified mock match
                  const progress = progressItem ? progressItem.progress : 0;
                  return (
                      <li key={course.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
                          <p className="font-bold text-lg text-gray-800">{course.title}</p>
                          <p className="text-sm text-gray-500 mb-2">Instructor: {course.instructor}</p>
                          
                          <div className="flex items-center space-x-3 mt-3">
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div className="bg-indigo-600 h-3 rounded-full transition-all duration-700" style={{width: `${progress}%`}}></div>
                              </div>
                              <span className="text-sm font-semibold text-indigo-700 w-10 text-right">{progress}%</span>
                          </div>
                          
                          <div className="text-right mt-4">
                              <Button 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setSelectedCourseForView(course)} // Open course viewer on click
                              >
                                Resume Course
                              </Button>
                          </div>
                      </li>
                  );
              })}
            </ul>
        </Card>
        <Card title="Enrollment Status">
            <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={enrollmentData} 
                            cx="50%" 
                            cy="50%" 
                            labelLine={false} 
                            outerRadius={100} 
                            fill="#8884d8" 
                            dataKey="value" 
                            nameKey="name"
                            paddingAngle={5}
                            isAnimationActive={false}
                        >
                            {enrollmentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} courses`} />
                        <Legend align="center" verticalAlign="bottom" layout="horizontal" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Upcoming Assignments">
              {upcomingAssignments.length > 0 ? (
                  <ul className="space-y-3">
                      {upcomingAssignments.map(assignment => (
                          <li key={`${assignment.courseTitle}-${assignment.title}`} className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div>
                                  <p className="font-semibold text-gray-800">{assignment.title}</p>
                                  <p className="text-sm text-gray-500">Course: {assignment.courseTitle} | Due: {assignment.dueDate || 'N/A'}</p>
                              </div>
                              <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                                onClick={() => setSelectedAssignmentForView(assignment)}
                              >
                                View & Submit
                              </Button>
                          </li>
                      ))}
                  </ul>
              ) : (
                  <p className="text-green-600 font-medium">No upcoming assignments. You're all caught up!</p>
              )}
          </Card>
          <Card title="Completed Work">
              {completedAssignments.length > 0 ? (
                  <ul className="space-y-3">
                      {completedAssignments.map(assignment => (
                          <li 
                            key={`${assignment.courseTitle}-${assignment.title}`} 
                            // FIX: Using backticks inside curly braces for template literal
                            className={`flex justify-between items-center p-3 rounded-lg border ${assignment.grade === 'N/A' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}
                          >
                              <div>
                                  <p className="font-semibold text-gray-800">{assignment.title}</p>
                                  <p className="text-sm text-gray-500">Course: {assignment.courseTitle}</p>
                              </div>
                              <div className="text-right">
                                  {/* FIX: Using backticks inside curly braces for template literal */}
                                  <span className={`px-3 py-1 text-xs rounded-full font-bold ${assignment.grade === 'N/A' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'}`}>{assignment.grade === 'N/A' ? 'Awaiting Grade' : `Grade: ${assignment.grade}`}</span>
                                  {assignment.grade !== 'N/A' && <p className="text-xs text-gray-500 mt-1">Feedback Received</p>}
                              </div>
                          </li>
                      ))}
                  </ul>
              ) : (
                  <p className="text-gray-500">Submit your first assignment to see it here.</p>
              )}
          </Card>
      </div>

      {/* Assignment Viewer Modal */}
      <Modal 
        show={!!selectedAssignmentForView} 
        onClose={() => setSelectedAssignmentForView(null)} 
        title={selectedAssignmentForView ? selectedAssignmentForView.title : ''}
        className="max-w-3xl"
      >
        {selectedAssignmentForView && (
            <AssignmentViewer
                assignment={selectedAssignmentForView}
                onClose={() => setSelectedAssignmentForView(null)}
                onSubmit={handleSubmitAssignment}
            />
        )}
      </Modal>

      {/* Course Content Viewer Modal (New) */}
      <Modal 
        show={!!selectedCourseForView} 
        onClose={() => setSelectedCourseForView(null)} 
        title="Course Content and Progress"
        className="max-w-4xl"
      >
        {selectedCourseForView && (
            <CourseContentViewer
                course={selectedCourseForView}
                studentName={studentName}
                onClose={() => setSelectedCourseForView(null)}
            />
        )}
      </Modal>
    </div>
  );
};

// --- Content Creator Dashboard (Unchanged) ---

const ContentCreatorDashboard = ({ currentUser, courses, setCourses }) => { // Updated props
  const [content] = useState([
    { id: 1, title: 'Quantum Mechanics Lecture 1', course: 'Introduction to Quantum Physics', status: 'Live', type: 'Video' },
    { id: 2, title: 'HTML & CSS Basics', course: 'Modern Web Development', status: 'Draft', type: 'Text Module' },
    { id: 3, title: 'The Punic Wars', course: 'The History of Ancient Rome', status: 'Under Review', type: 'Quiz' },
    { id: 4, title: 'Advanced React Hooks', course: 'Modern Web Development', status: 'Draft', type: 'Assignment' },
  ]);

  const statusColors = {
      'Live': 'bg-green-200 text-green-800',
      'Draft': 'bg-gray-200 text-gray-800',
      'Under Review': 'bg-yellow-200 text-yellow-800',
  }

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-extrabold text-indigo-700">Content Creator Dashboard</h2>
      <p className="text-gray-600 border-l-4 border-indigo-400 pl-3 italic">Welcome, {currentUser.name}. Develop and manage educational course materials.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-100 p-6 rounded-xl shadow-md text-center border-b-4 border-gray-500">
              <h4 className="text-lg font-semibold text-gray-800">Total Content Items</h4>
              <p className="text-5xl font-extrabold text-gray-900 mt-1">{content.length}</p>
          </div>
          <div className="bg-green-100 p-6 rounded-xl shadow-md text-center border-b-4 border-green-500">
              <h4 className="text-lg font-semibold text-green-800">Live Content</h4>
              <p className="text-5xl font-extrabold text-green-900 mt-1">{content.filter(c => c.status === 'Live').length}</p>
          </div>
          <div className="bg-yellow-100 p-6 rounded-xl shadow-md text-center border-b-4 border-yellow-500">
              <h4 className="text-lg font-semibold text-yellow-800">Under Review</h4>
              <p className="text-5xl font-extrabold text-yellow-900 mt-1">{content.filter(c => c.status === 'Under Review').length}</p>
          </div>
          <div className="bg-red-100 p-6 rounded-xl shadow-md text-center border-b-4 border-red-500">
              <h4 className="text-lg font-semibold text-red-800">Drafts</h4>
              <p className="text-5xl font-extrabold text-red-900 mt-1">{content.filter(c => c.status === 'Draft').length}</p>
          </div>
      </div>
      
      <Card title="My Content Queue">
        <div className="flex justify-between items-center mb-4">
            <p className="text-gray-500">List of modules and assignments managed by you.</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Create New Content</Button>
        </div>
        <ul className="space-y-3">
          {content.map(item => (
            <li key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition">
              <div>
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-indigo-500">{item.course} <span className="text-gray-500 ml-2">({item.type})</span></p>
              </div>
              <div className="flex items-center space-x-3">
                {/* FIX: Using backticks inside curly braces for template literal */}
                <span className={`px-3 py-1 text-xs rounded-full font-semibold ${statusColors[item.status]}`}>
                    {item.status}
                </span>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-xs">Edit Content</Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      
      <Card title="Review & Collaboration (Simulated)">
        <p className="text-gray-500">Content modules that have been flagged for collaborative review by instructors or editors.</p>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-800">Review Required: Punic Wars Module</p>
            <p className="text-sm text-gray-600">Feedback from Dr. Vance: "Needs more detailed primary sources."</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 mt-3 text-xs">Address Feedback</Button>
        </div>
      </Card>
    </div>
  );
};

// --- Main App Component (Updated state lifting) ---

const App = () => {
  const roles = ['Admin', 'Instructor', 'Content Creator', 'Student'];
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [courses, setCourses] = useState(initialCourses); // State lifted here

  const loginAs = (name, role, password) => {
    setLoginError(null); // Clear previous errors
    
    // Determine the internal object key from the selected role string.
    let roleKey;
    if (role === 'Content Creator') {
        // FIX: Explicitly map "Content Creator" to the "creator" key
        roleKey = 'creator'; 
    } else {
        // Works for "Admin", "Instructor", "Student"
        roleKey = role.toLowerCase(); 
    }

    const mockUser = initialUsers[roleKey];
    
    // Mock Authentication Logic: Check if the provided name matches the mock user name for the selected role.
    if (mockUser && mockUser.name === name && mockUser.role === role) {
        setUser(mockUser);
    } else {
        setLoginError(`Login failed: Invalid credentials for role "${role}". (Hint: Use the exact mock name corresponding to the role.)`);
    }
  };
  
  const logout = () => {
    setUser(null);
    setLoginError(null);
  };
  
  const renderDashboard = () => {
    if (!user) return null;
    // Pass courses and setCourses to the relevant dashboards
    switch (user.role) {
      case 'Admin':
        return <AdminDashboard currentUser={user} courses={courses} setCourses={setCourses} />;
      case 'Instructor':
        return <InstructorDashboard currentUser={user} courses={courses} setCourses={setCourses} />;
      case 'Student':
        return <StudentDashboard currentUser={user} courses={courses} setCourses={setCourses} />;
      case 'Content Creator':
        return <ContentCreatorDashboard currentUser={user} courses={courses} setCourses={setCourses} />;
      default:
        return <p className="text-center py-10 text-xl text-red-500">Error: No dashboard found for this role.</p>;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <script src="https://cdn.tailwindcss.com"></script>
      <header className="bg-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 inline-block mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-8H5a1 1 0 000 2h4v4a1 1 0 002 0v-4h4a1 1 0 100-2h-4V5a1 1 0 10-2 0v4z" clipRule="evenodd" transform="rotate(-90 10 10)"/>
                </svg>
                EDU-LMS Dashboard
            </h1>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium hidden sm:inline">Logged in as: <span className="font-semibold text-indigo-600">{user.name}</span> ({user.role})</span>
              <Button onClick={logout} className="bg-red-600 hover:bg-red-700">Logout</Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {!user ? (
          <LoginScreen roles={roles} onLogin={loginAs} error={loginError} />
        ) : (
          renderDashboard()
        )}
      </main>
      
      <footer className="mt-10 p-4 text-center text-gray-500 text-sm border-t">
        <p>LMS Prototype (Dashboard Focus) - Currently using **Mock Data** for visualization and role simulation.</p>
      </footer>
    </div>
  );
};

export default App;
