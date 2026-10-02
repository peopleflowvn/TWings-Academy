import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Headphones, 
  FileText, 
  HelpCircle, 
  Layers, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Download, 
  MessageSquare, 
  Edit3, 
  Sparkles, 
  FastForward, 
  Rewind, 
  Menu, 
  X,
  VolumeX,
  ArrowRight,
  Send,
  Trash2
} from 'lucide-react';
import { Course, Lesson, Chapter, Flashcard, NoteItem } from '../types';

interface LMSPlayerProps {
  course: Course;
  initialLessonId?: string;
  completedLessonIds: string[];
  allCourses?: Course[];
  onSelectCourse?: (course: Course) => void;
  onToggleCompleteLesson: (lessonId: string) => void;
  onBackToCatalog: () => void;
}

export const LMSPlayer: React.FC<LMSPlayerProps> = ({
  course,
  initialLessonId,
  completedLessonIds,
  allCourses,
  onSelectCourse,
  onToggleCompleteLesson,
  onBackToCatalog,
}) => {
  // Find initial lesson or default to first
  const chapters = course.chapters || course.syllabus || [];
  const allLessons: Lesson[] = chapters.flatMap((c) => c.lessons);
  const [currentLesson, setCurrentLesson] = useState<Lesson>(() => {
    if (initialLessonId) {
      const found = allLessons.find((l) => l.id === initialLessonId);
      if (found) return found;
    }
    return allLessons[0] || chapters[0]?.lessons[0] || {
      id: 'default-les',
      title: 'Bài học 1',
      duration: '10 phút',
      type: 'video'
    };
  });

  useEffect(() => {
    const chs = course.chapters || course.syllabus || [];
    const lessons = chs.flatMap((c) => c.lessons);
    if (initialLessonId) {
      const found = lessons.find((l) => l.id === initialLessonId);
      if (found) {
        setCurrentLesson(found);
        return;
      }
    }
    if (lessons[0]) {
      setCurrentLesson(lessons[0]);
    }
  }, [course.id, initialLessonId]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'notes' | 'discussion' | 'resources'>('content');

  // Video player simulated states
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(25);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);

  // Audio player simulated states
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(45);
  const [audioDuration] = useState(480);
  const [showAudioScript, setShowAudioScript] = useState(false);

  // Audio listening quiz answers & submissions
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [knownCardIds, setKnownCardIds] = useState<string[]>([]);

  // PDF Page state
  const [currentPdfPage, setCurrentPdfPage] = useState(1);

  // Notes state
  const [notes, setNotes] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<NoteItem[]>([]);

  // Discussion comments
  const [discussionList, setDiscussionList] = useState([
    {
      id: 'd1',
      author: 'Nguyễn Văn Minh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      time: '2 giờ trước',
      content: 'Thầy cho em hỏi trong Section 3 khi cả hai người đối thoại cùng đồng ý một quan điểm thì câu hỏi thường hay bẫy ở điểm nào ạ?',
      reply: 'Chào Minh, bẫy thường xuất hiện khi một người đưa ra điều kiện bổ sung (Qualifying condition, ví dụ: "provided that we obtain approval first"). Em chú ý lắng nghe các liên từ điều kiện nhé!'
    },
    {
      id: 'd2',
      author: 'Trần Thị Thu Hà',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80',
      time: '1 ngày trước',
      content: 'Bộ từ vựng Flashcards C1 rất trực quan, có thêm phiên âm IPA và ví dụ cụ thể giúp mình nhớ lâu hơn hẳn.',
    }
  ]);
  const [newComment, setNewComment] = useState('');

  // Handle lesson navigation
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const isCompleted = completedLessonIds.includes(currentLesson.id);

  // Speech pronunciation helper
  const speakTerm = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsPlaying(false);
    setIsAudioPlaying(false);
    setVideoProgress(0);
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setCurrentPdfPage(1);
  };

  const handleAddNote = () => {
    if (!notes.trim()) return;
    const newNoteItem: NoteItem = {
      id: `note-${Date.now()}`,
      courseId: course.id,
      lessonId: currentLesson.id,
      lessonTitle: currentLesson.title,
      timestamp: `${Math.floor(videoProgress * 10)}s`,
      timestampSeconds: Math.floor(videoProgress * 10),
      content: notes,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setSavedNotes([newNoteItem, ...savedNotes]);
    setNotes('');
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setDiscussionList([
      {
        id: `d-${Date.now()}`,
        author: 'Học viên Twings (Bạn)',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        time: 'Vừa xong',
        content: newComment,
      },
      ...discussionList
    ]);
    setNewComment('');
  };

  const completionRate = Math.round(
    (completedLessonIds.filter((id) => allLessons.some((l) => l.id === id)).length /
      Math.max(1, allLessons.length)) *
      100
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* LMS Moodle Top Bar */}
      <header className="h-14 bg-[#0A192F] border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Đóng / mở giáo trình"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={onBackToCatalog}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Về Trang Bán Khóa Học</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {allCourses && allCourses.length > 1 && onSelectCourse ? (
            <select
              value={course.id}
              onChange={(e) => {
                const found = allCourses.find((c) => c.id === e.target.value);
                if (found) onSelectCourse(found);
              }}
              className="bg-slate-800 text-amber-300 font-bold border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none max-w-xs sm:max-w-md truncate cursor-pointer"
            >
              {allCourses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.title}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
              {course.title}
            </div>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tiến độ khóa học:</span>
            <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="font-mono font-bold text-amber-400">{completionRate}%</span>
          </div>

          <button
            onClick={() => onToggleCompleteLesson(currentLesson.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/50'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Đã Hoàn Thành' : 'Đánh Dấu Hoàn Thành'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Player Stage */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Moodle Curriculum Tree */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } shrink-0 bg-[#071324] border-r border-slate-800 flex flex-col transition-all duration-200 overflow-hidden z-20`}
        >
          <div className="p-4 border-b border-slate-800 bg-[#0B1E38]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Nội Dung Khóa Học
            </h2>
            <div className="text-[11px] text-slate-400 mt-1">
              {allLessons.length} bài học · Chuẩn tương thích Moodle
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-3">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  {chapter.title}
                </div>
                <div className="space-y-1 mt-1">
                  {chapter.lessons.map((lesson) => {
                    const active = lesson.id === currentLesson.id;
                    const done = completedLessonIds.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1E3A8A] text-white shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium leading-snug line-clamp-2">
                            {lesson.title}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span className="capitalize">{lesson.type.replace('_', ' ')}</span>
                            <span>·</span>
                            <span>{lesson.duration}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Learning Stage */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-950">
          {/* Top Interactive Multimedia Stage */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Header inside stage */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    {course.category} · {currentLesson.type.toUpperCase().replace('_', ' ')}
                  </span>
                  <h1 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                    {currentLesson.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!prevLesson}
                    onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                    title="Bài trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!nextLesson}
                    onClick={() => nextLesson && handleSelectLesson(nextLesson)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                    title="Bài tiếp theo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* RENDER BY LESSON TYPE */}
              {/* TYPE 1: VIDEO LESSON */}
              {currentLesson.type === 'video' && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between p-4 sm:p-6 group">
                    {/* Simulated video background */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"
                      style={{ backgroundImage: `url(${currentLesson.videoPoster || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Top overlay badges */}
                    <div className="relative z-10 flex items-center justify-between text-xs">
                      <span className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-amber-400 font-semibold border border-amber-500/30">
                        1080p HD Studio Quality
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/60 text-slate-300 font-mono text-[11px]">
                        Giảng viên: {course.instructor?.name || course.instructors?.[0]?.name || course.partner?.name || 'Giảng viên'}
                      </span>
                    </div>

                    {/* Big Center Play/Pause button */}
                    <div className="relative z-10 flex items-center justify-center my-auto">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-7 h-7 fill-slate-950" />
                        ) : (
                          <Play className="w-7 h-7 fill-slate-950 ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Controls Bar */}
                    <div className="relative z-10 space-y-2 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
                      {/* Scrub Bar */}
                      <div 
                        className="w-full h-1.5 bg-slate-700 rounded-full cursor-pointer overflow-hidden"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          setVideoProgress(Math.round(pos * 100));
                        }}
                      >
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <span className="font-mono text-[11px] text-slate-400">
                            {Math.floor((videoProgress * 12) / 60)}:{(Math.floor(videoProgress * 12) % 60).toString().padStart(2, '0')} / {currentLesson.duration}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Speed selector */}
                          <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            <span>Tốc độ:</span>
                            {[1, 1.25, 1.5, 2].map((spd) => (
                              <button
                                key={spd}
                                onClick={() => setPlaybackSpeed(spd)}
                                className={`px-1 rounded cursor-pointer ${
                                  playbackSpeed === spd ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                              showTranscript ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Phụ đề / Transcript
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Transcript Panel */}
                  {showTranscript && currentLesson.videoTranscript && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                        <span className="font-bold uppercase tracking-wider text-amber-400">
                          Bản Phụ Đề & Diễn Giải Bài Giảng
                        </span>
                        <span className="text-[11px]">Tự động đồng bộ theo thời gian bài giảng</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {currentLesson.videoTranscript}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 2: AUDIO LISTENING TEST MODULE */}
              {currentLesson.type === 'audio_listening' && (
                <div className="space-y-6">
                  {/* Audio Player Card */}
                  <div className="bg-gradient-to-r from-[#0F294D] to-[#1A365D] border border-blue-900/60 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Headphones className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Audio Listening Track</div>
                          <div className="text-xs text-slate-300">IELTS Academic Listening Section 3 Format</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowAudioScript(!showAudioScript)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                      >
                        {showAudioScript ? 'Ẩn Lời Thoại (Script)' : 'Xem Lời Thoại (Tapescript)'}
                      </button>
                    </div>

                    {/* Audio Scrub Bar */}
                    <div className="space-y-2">
                      <div 
                        className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = (e.clientX - rect.left) / rect.width;
                          setAudioCurrentTime(Math.floor(percent * audioDuration));
                        }}
                      >
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 font-mono">
                        <span>
                          {Math.floor(audioCurrentTime / 60)}:{(audioCurrentTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span>
                          {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setAudioCurrentTime((prev) => Math.max(0, prev - 10))}
                        className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Tua lại 10s"
                      >
                        <Rewind className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                      >
                        {isAudioPlaying ? (
                          <Pause className="w-6 h-6 fill-slate-950" />
                        ) : (
                          <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setAudioCurrentTime((prev) => Math.min(audioDuration, prev + 10))}
                        className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Tua tới 10s"
                      >
                        <FastForward className="w-5 h-5" />
                      </button>
                    </div>

                    {showAudioScript && currentLesson.audioScript && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                        <strong className="text-amber-400 block mb-2 font-mono">TAPESCRIPT:</strong>
                        {currentLesson.audioScript}
                      </div>
                    )}
                  </div>

                  {/* Interactive Questions with Instant Submission */}
                  {currentLesson.quizQuestions && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-purple-400" />
                          Câu Hỏi Trắc Nghiệm Nghe Hiểu (Questions 1 - {currentLesson.quizQuestions.length})
                        </h3>
                        {quizSubmitted && (
                          <span className="text-xs font-bold text-emerald-400">
                            Đã chấm điểm tự động
                          </span>
                        )}
                      </div>

                      <div className="space-y-6">
                        {currentLesson.quizQuestions.map((q, idx) => {
                          const userAns = selectedAnswers[q.id];
                          const isCorrect = userAns === q.correctAnswerId;

                          return (
                            <div key={q.id} className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                              <div className="font-semibold text-xs sm:text-sm text-slate-200">
                                {idx + 1}. {q.question}
                              </div>

                              <div className="space-y-2">
                                {q.options.map((opt) => {
                                  const isSelected = userAns === opt.id;
                                  return (
                                    <label
                                      key={opt.id}
                                      onClick={() => {
                                        if (!quizSubmitted) {
                                          setSelectedAnswers({ ...selectedAnswers, [q.id]: opt.id });
                                        }
                                      }}
                                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-blue-900/40 border-amber-500 text-white'
                                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={q.id}
                                        checked={isSelected}
                                        onChange={() => {}}
                                        disabled={quizSubmitted}
                                        className="text-amber-500 focus:ring-amber-500"
                                      />
                                      <span>{opt.text}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              {quizSubmitted && (
                                <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                                  isCorrect ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-800/50 text-rose-300'
                                }`}>
                                  <div className="font-bold mb-1">
                                    {isCorrect ? '✓ Chính xác!' : '✗ Chưa chính xác!'}
                                  </div>
                                  <div className="text-slate-300">{q.explanation}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => {
                            setQuizSubmitted(true);
                            onToggleCompleteLesson(currentLesson.id);
                          }}
                          disabled={Object.keys(selectedAnswers).length === 0}
                          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Nộp Bài & Xem Giải Thích Chi Tiết
                        </button>

                        {quizSubmitted && (
                          <button
                            onClick={() => {
                              setQuizSubmitted(false);
                              setSelectedAnswers({});
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Làm Lại Bài Này
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 3: FLASHCARD VOCABULARY DECK */}
              {currentLesson.type === 'flashcard' && currentLesson.flashcards && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-amber-400">
                      Thẻ từ vựng {currentCardIndex + 1} / {currentLesson.flashcards.length}
                    </span>
                    <span>
                      Đã thuộc: {knownCardIds.length}/{currentLesson.flashcards.length}
                    </span>
                  </div>

                  {/* 3D Flip Card Container */}
                  {(() => {
                    const card = currentLesson.flashcards[currentCardIndex];
                    if (!card) return null;

                    return (
                      <div className="perspective-1000 max-w-xl mx-auto">
                        <div
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className={`w-full min-h-[300px] p-8 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-2xl ${
                            isCardFlipped
                              ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-700/60'
                              : 'bg-gradient-to-br from-[#0F294D] to-[#1E3A8A] border-blue-700/60'
                          }`}
                        >
                          {/* Top of Card */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
                              {card.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakTerm(card.term);
                                }}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                title="Phát âm từ vựng này"
                              >
                                <Volume2 className="w-4 h-4 text-amber-300" />
                              </button>
                              <span className="text-[11px] text-slate-400">
                                {isCardFlipped ? 'Mặt sau (Nghĩa)' : 'Mặt trước (Bấm lật)'}
                              </span>
                            </div>
                          </div>

                          {/* Center of Card */}
                          <div className="text-center my-6 space-y-3">
                            {!isCardFlipped ? (
                              <>
                                <h3 className="text-3xl font-extrabold text-white tracking-tight">
                                  {card.term}
                                </h3>
                                <div className="text-amber-300 font-mono text-base">
                                  {card.ipa}
                                </div>
                                <p className="text-xs text-slate-300 max-w-md mx-auto pt-2">
                                  "{card.exampleSentence}"
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="text-lg font-bold text-amber-400">
                                  {card.definitionVi}
                                </div>
                                <div className="text-xs text-slate-300 italic max-w-md mx-auto">
                                  "{card.definitionEn}"
                                </div>
                                <div className="text-xs text-slate-400 pt-3 border-t border-slate-700/50">
                                  <strong>Dịch câu ví dụ:</strong> {card.exampleTranslation}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Bottom instruction */}
                          <div className="text-center text-[11px] text-slate-400">
                            💡 Nhấp chuột vào thẻ để lật qua lại giữa tiếng Anh và tiếng Việt
                          </div>
                        </div>

                        {/* Flashcard Action Buttons */}
                        <div className="flex items-center justify-between gap-4 mt-6">
                          <button
                            onClick={() => {
                              setIsCardFlipped(false);
                              setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                            }}
                            disabled={currentCardIndex === 0}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" /> Thẻ trước
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (!knownCardIds.includes(card.id)) {
                                  setKnownCardIds([...knownCardIds, card.id]);
                                }
                                if (currentCardIndex < currentLesson.flashcards!.length - 1) {
                                  setCurrentCardIndex(currentCardIndex + 1);
                                  setIsCardFlipped(false);
                                }
                              }}
                              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                            >
                              ✓ Đã Thuộc
                            </button>
                            <button
                              onClick={() => {
                                setKnownCardIds(knownCardIds.filter((id) => id !== card.id));
                                if (currentCardIndex < currentLesson.flashcards!.length - 1) {
                                  setCurrentCardIndex(currentCardIndex + 1);
                                  setIsCardFlipped(false);
                                }
                              }}
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            >
                              Cần Ôn Lại
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setIsCardFlipped(false);
                              setCurrentCardIndex((prev) =>
                                Math.min(currentLesson.flashcards!.length - 1, prev + 1)
                              );
                            }}
                            disabled={currentCardIndex === currentLesson.flashcards.length - 1}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-colors cursor-pointer flex items-center gap-1"
                          >
                            Thẻ tiếp <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TYPE 4: INTERACTIVE QUIZ */}
              {currentLesson.type === 'quiz' && currentLesson.quizQuestions && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      Bài Kiểm Tra Trắc Nghiệm Tự Động ({currentLesson.quizQuestions.length} câu)
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {currentLesson.quizQuestions.map((q, idx) => {
                      const userAns = selectedAnswers[q.id];
                      const isCorrect = userAns === q.correctAnswerId;

                      return (
                        <div key={q.id} className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <div className="font-semibold text-xs sm:text-sm text-slate-200">
                            {idx + 1}. {q.question}
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt) => {
                              const isSelected = userAns === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  onClick={() => {
                                    if (!quizSubmitted) {
                                      setSelectedAnswers({ ...selectedAnswers, [q.id]: opt.id });
                                    }
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-900/40 border-amber-500 text-white'
                                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={isSelected}
                                    onChange={() => {}}
                                    disabled={quizSubmitted}
                                    className="text-amber-500 focus:ring-amber-500"
                                  />
                                  <span>{opt.text}</span>
                                </label>
                              );
                            })}
                          </div>

                          {quizSubmitted && (
                            <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                              isCorrect ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-800/50 text-rose-300'
                            }`}>
                              <div className="font-bold mb-1">
                                {isCorrect ? '✓ Đáp án chuẩn xác' : '✗ Đáp án chưa đúng'}
                              </div>
                              <div className="text-slate-300">{q.explanation}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setQuizSubmitted(true);
                        onToggleCompleteLesson(currentLesson.id);
                      }}
                      disabled={Object.keys(selectedAnswers).length === 0}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Hoàn Thành & Chấm Điểm
                    </button>

                    {quizSubmitted && (
                      <button
                        onClick={() => {
                          setQuizSubmitted(false);
                          setSelectedAnswers({});
                        }}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Làm Lại
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TYPE 5: PDF / COMPANION SLIDE READER */}
              {currentLesson.type === 'pdf_material' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {currentLesson.pdfTitle || 'Tài Liệu Bài Học & Slide Thuyết Trình'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Trang {currentPdfPage} / {currentLesson.pdfPages?.length || 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPdfPage((p) => Math.max(1, p - 1))}
                        disabled={currentPdfPage <= 1}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPdfPage((p) =>
                            Math.min(currentLesson.pdfPages?.length || 1, p + 1)
                          )
                        }
                        disabled={currentPdfPage >= (currentLesson.pdfPages?.length || 1)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Simulated PDF Canvas Viewport */}
                  <div className="bg-white text-slate-900 rounded-xl p-8 min-h-[360px] shadow-inner font-sans space-y-4">
                    <div className="border-b border-slate-200 pb-3 flex justify-between items-center text-xs text-slate-500">
                      <span className="font-bold text-[#0F294D]">TWINGS ENGLISH ACADEMY · MOODLE LMS</span>
                      <span>Trang {currentPdfPage}</span>
                    </div>

                    <div className="py-4 space-y-3">
                      <h4 className="text-lg font-bold text-[#0F294D]">
                        {currentLesson.pdfPages?.[currentPdfPage - 1] || 'Slide Tóm Tắt Trọng Tâm Kiến Thức'}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Tài liệu bổ trợ được biên soạn độc quyền bởi Hội đồng Học thuật Twings Edu, tích hợp phương pháp tư duy phản biện ngôn ngữ hiện đại, hỗ trợ học viên tự ôn luyện tại nhà sau bài giảng video.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                      <strong>Lưu ý quan trọng:</strong> Học viên vui lòng hoàn thành bài tập trắc nghiệm và tải trọn bộ file PDF bên dưới để làm quen với dạng bài thi chính thức.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tabs: Notes, Q&A, Resources */}
          <div className="flex-1 bg-slate-950 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Tabs Bar */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'content'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tổng Quan Bài Học
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'notes'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Ghi Chú Cá Nhân ({savedNotes.length})
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'discussion'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Hỏi Đáp & Thảo Luận ({discussionList.length})
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'resources'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Tài Liệu Đính Kèm
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'content' && (
                <div className="space-y-4 text-xs text-slate-300">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                    <h3 className="text-sm font-bold text-white">Mục tiêu học tập của bài này</h3>
                    <p className="leading-relaxed">
                      Nắm vững kiến thức trọng tâm, ghi nhớ từ vựng học thuật C1 và hoàn thành đầy đủ các bài tập tự luyện trên hệ thống Moodle LMS để đạt chuẩn đầu ra cam kết của Twings Edu.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white block">
                      Thêm ghi chú mới vào bài học này:
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ghi chú kiến thức, collocations hoặc thắc mắc của bạn tại đây..."
                      rows={3}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddNote}
                        disabled={!notes.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Lưu Ghi Chú
                      </button>
                    </div>
                  </div>

                  {savedNotes.length > 0 && (
                    <div className="space-y-2">
                      {savedNotes.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-start text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] text-amber-400">
                              <span>{item.lessonTitle}</span>
                              <span>·</span>
                              <span>{item.createdAt}</span>
                            </div>
                            <div className="text-slate-200">{item.content}</div>
                          </div>
                          <button
                            onClick={() => setSavedNotes(savedNotes.filter((n) => n.id !== item.id))}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Xóa ghi chú"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DISCUSSION */}
              {activeTab === 'discussion' && (
                <div className="space-y-4">
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Đặt câu hỏi cho giảng viên hoặc thảo luận cùng các bạn học..."
                      className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Câu Hỏi</span>
                    </button>
                  </form>

                  <div className="space-y-3">
                    {discussionList.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.avatar}
                            alt={item.author}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <span className="font-semibold text-white">{item.author}</span>
                            <span className="text-[10px] text-slate-500 ml-2">{item.time}</span>
                          </div>
                        </div>
                        <p className="text-slate-300 pl-9">{item.content}</p>

                        {item.reply && (
                          <div className="ml-9 p-3 rounded-lg bg-[#0F294D]/60 border border-blue-900/50 text-slate-200 text-xs space-y-1">
                            <span className="text-amber-400 font-bold block text-[11px]">
                              ✦ Phản Hồi Từ Giảng Viên Twings Edu:
                            </span>
                            <p className="text-slate-300">{item.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: RESOURCES */}
              {activeTab === 'resources' && (
                <div className="space-y-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
                    <h3 className="font-bold text-white uppercase tracking-wider">
                      Tài Liệu Đính Kèm Tải Về Miễn Phí
                    </h3>
                    <div className="divide-y divide-slate-800">
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="font-semibold text-slate-200">
                              Twings_IELTS_Listening_Distractors_Cheatsheet.pdf
                            </div>
                            <div className="text-[11px] text-slate-500">2.4 MB · Bản quyền Twings Edu</div>
                          </div>
                        </div>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert('Tài liệu PDF đang được tải về thiết bị của bạn!');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải Về
                        </a>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Headphones className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="font-semibold text-slate-200">
                              Audio_Track_Full_Mock_Section3.mp3
                            </div>
                            <div className="text-[11px] text-slate-500">14.8 MB · Âm thanh chuẩn giọng bản xứ UK</div>
                          </div>
                        </div>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert('File âm thanh MP3 đang được tải về!');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải Về
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
