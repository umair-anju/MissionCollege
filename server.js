const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB (add this at the top with other requires)
mongoose.connect('mongodb://localhost:27017/quiz_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// User Schema and Model (add this after MongoDB connection)
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const User = mongoose.model('User', UserSchema);

// ==================== AUTHENTICATION ROUTES ====================

// Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Validate input
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match' 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already in use' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during signup' 
        });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Check password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
});

// ==================== QUIZ ROUTES (YOUR EXISTING CODE) ====================

// Question bank with 50 questions per category
const questionBank = {
    math: [
        { id: 1, question: "What is 15% of 200?", options: ["15", "30", "45", "60"], answer: "30" },
        { id: 2, question: "Solve for x: 2x + 5 = 15", options: ["5", "10", "7.5", "20"], answer: "5" },
        { id: 3, question: "What is the square root of 144?", options: ["11", "12", "13", "14"], answer: "12" },
        { id: 4, question: "If 3x - 7 = 14, what is x?", options: ["5", "6", "7", "8"], answer: "7" },
        { id: 5, question: "What is 3/4 expressed as a decimal?", options: ["0.25", "0.5", "0.75", "1.0"], answer: "0.75" },
        { id: 6, question: "Calculate the area of a rectangle with length 8 and width 5", options: ["13", "40", "26", "35"], answer: "40" },
        { id: 7, question: "What is the next prime number after 7?", options: ["8", "9", "10", "11"], answer: "11" },
        { id: 8, question: "Simplify: (2 + 3) × 4", options: ["20", "14", "24", "9"], answer: "20" },
        { id: 9, question: "Convert 0.75 to a fraction", options: ["1/4", "1/2", "3/4", "2/3"], answer: "3/4" },
        { id: 10, question: "What is 5 squared minus 3 squared?", options: ["16", "19", "22", "25"], answer: "16" },
        { id: 50, question: "What is the area of a circle with radius 7? (π=22/7)", options: ["154", "44", "88", "22"], answer: "154" }
    ],
    english: [
        { id: 101, question: "Choose the correct spelling:", options: ["Accomodate", "Acommodate", "Accommodate", "Acomodate"], answer: "Accommodate" },
        { id: 102, question: "What is the synonym of 'Benevolent'?", options: ["Cruel", "Kind", "Selfish", "Rude"], answer: "Kind" },
        { id: 103, question: "Identify the adverb: 'She sings beautifully.'", options: ["She", "sings", "beautifully", "None"], answer: "beautifully" },
        { id: 104, question: "What is the plural of 'child'?", options: ["childs", "children", "childes", "childern"], answer: "children" },
        { id: 105, question: "Which word is a preposition: 'The book is on the table.'", options: ["book", "is", "on", "table"], answer: "on" },
        { id: 106, question: "Identify the conjunction: 'I wanted to go, but it was raining.'", options: ["I", "wanted", "but", "raining"], answer: "but" },
        { id: 107, question: "What is the past tense of 'run'?", options: ["runned", "ran", "run", "running"], answer: "ran" },
        { id: 108, question: "Which sentence is correct?", options: ["She don't like apples.", "She doesn't likes apples.", "She doesn't like apples.", "She didn't likes apples."], answer: "She doesn't like apples." },
        { id: 109, question: "What is the antonym of 'generous'?", options: ["kind", "stingy", "friendly", "happy"], answer: "stingy" },
        { id: 110, question: "Identify the verb: 'The cat quickly jumped over the fence.'", options: ["cat", "quickly", "jumped", "fence"], answer: "jumped" },
        { id: 150, question: "What is the past participle of 'swim'?", options: ["Swam", "Swimmed", "Swum", "Swimming"], answer: "Swum" }
    ],
    gk: [
        { id: 201, question: "Who is the current Prime Minister of Pakistan?", options: ["Imran Khan", "Nawaz Sharif", "Shehbaz Sharif", "Asif Ali Zardari"], answer: "Shehbaz Sharif" },
        { id: 202, question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: "Mars" },
        { id: 203, question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: "Canberra" },
        { id: 204, question: "Who wrote 'Hamlet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], answer: "William Shakespeare" },
        { id: 205, question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: "Pacific" },
        { id: 206, question: "In which year did Pakistan gain independence?", options: ["1945", "1947", "1950", "1935"], answer: "1947" },
        { id: 207, question: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], answer: "Yen" },
        { id: 208, question: "Which mountain is the highest in the world?", options: ["K2", "Mount Everest", "Nanga Parbat", "Kangchenjunga"], answer: "Mount Everest" },
        { id: 209, question: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"], answer: "Blue Whale" },
        { id: 210, question: "Which country hosted the 2022 FIFA World Cup?", options: ["Brazil", "Russia", "Qatar", "France"], answer: "Qatar" },
        { id: 250, question: "Who is known as the 'Father of the Nation' in Pakistan?", options: ["Allama Iqbal", "Muhammad Ali Jinnah", "Liaquat Ali Khan", "Ayub Khan"], answer: "Muhammad Ali Jinnah" }
    ]
};

// Helper: Get 10 random from each category
function getRandomQuestions(bank, countPerCategory = 10) {
    const categories = ['math', 'english', 'gk'];
    let result = [];

    categories.forEach(cat => {
        const questions = bank[cat];
        if (questions.length < countPerCategory) {
            throw new Error(`Not enough questions in category: ${cat}`);
        }

        const shuffled = questions.sort(() => 0.5 - Math.random());
        result.push(...shuffled.slice(0, countPerCategory));
    });

    return result;
}

// Route: Get random questions
/*app.get('/api/questions', (req, res) => {
    try {
        const questions = getRandomQuestions(questionBank);
        res.json({ success: true, questions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});*/
app.get('/api/questions', (req, res) => {
    try {
        const questions = getRandomQuestions(questionBank);
        res.json(questions); // Fixed: Return just the questions array directly
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route: Submit test
app.post('/api/submit-test', async (req, res) => {
    const { email, answers } = req.body;

    if (!email || !Array.isArray(answers)) {
        return res.status(400).json({ success: false, error: 'Email and answers are required' });
    }

    try {
        let score = 0;

        answers.forEach(ans => {
            let correctAnswer = null;

            for (let cat of Object.keys(questionBank)) {
                const question = questionBank[cat].find(q => q.id === ans.questionId);
                if (question) {
                    correctAnswer = question.answer;
                    break;
                }
            }

            if (correctAnswer && correctAnswer === ans.selectedOption) {
                score++;
            }
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: '',
                pass: ''
            }
        });

        await transporter.sendMail({
            from: 'umair225290@gmail.com',
            to: email,
            subject: 'Admission Test Results',
            text: `Thank you for taking the test. Your score is: ${score}/30`
        });

        res.json({ success: true, score });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Failed to send result email' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
