
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameObject, 
  Ranking,
  COLUMNS, 
  ROWS, 
  COLOR_PALETTE, 
  FALL_DURATION,
  SPAWN_DELAY
} from './types';

const SUPABASE_URL = 'https://fgmchdihogjowgjsbghr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SmDleodGwF_AxWQX8pFW2A_Sn7wcUE-';

// --- 100가지 테마 기반 로컬 데이터베이스 (각 20단어) ---
const THEME_DB: Record<string, string[]> = {
  "우주 탐사": ["태양", "지구", "행성", "은하", "운석", "혜성", "성운", "궤도", "중력", "위성", "화성", "목성", "토성", "우주선", "블랙홀", "성단", "공전", "자전", "광년", "천체"],
  "한국 요리": ["김치", "비빔밥", "불고기", "냉면", "갈비", "떡볶이", "잡채", "파전", "삼계탕", "만두", "김밥", "국밥", "순대", "보쌈", "족발", "육회", "전골", "식혜", "수정과", "약과"],
  "조선 시대": ["임금", "세자", "경복궁", "과거", "한복", "선비", "갓", "거북선", "서원", "성균관", "암행어사", "병풍", "가마", "도자기", "민화", "창덕궁", "사극", "어명", "역사", "실학"],
  "심해 생물": ["고래", "상어", "해파리", "가오리", "문어", "심해어", "플랑크톤", "산호", "진주", "해초", "거북", "오징어", "불가사리", "해마", "멍게", "해삼", "전복", "가리비", "새우", "꽃게"],
  "컴퓨터": ["모니터", "마우스", "키보드", "메모리", "칩셋", "하드", "폴더", "파일", "네트워크", "서버", "코딩", "버그", "데이터", "클라우드", "보안", "백업", "스크롤", "클릭", "윈도우", "로그인"],
  "스포츠": ["축구", "농구", "야구", "배구", "테니스", "골프", "수영", "육상", "양궁", "태권도", "유도", "펜싱", "탁구", "마라톤", "조정", "빙상", "스키", "승마", "체조", "레슬링"],
  "날씨": ["햇살", "구름", "소나기", "번개", "안개", "태풍", "폭설", "한파", "폭염", "우박", "무지개", "바람", "습도", "온도", "기압", "계절", "장마", "미세먼지", "노을", "새벽녘"],
  "음악 예술": ["피아노", "바이올린", "기타", "드럼", "작곡", "지휘", "합창", "화음", "리듬", "멜로디", "악보", "성악", "오페라", "뮤지컬", "독주", "연주", "템포", "조율", "협주곡", "교향곡"],
  "사이버펑크": ["네온", "해커", "안드로이드", "의수", "암시장", "데이터칩", "가상현실", "크롬", "빌딩", "슬럼", "비행선", "인공지능", "전선", "홀로그램", "강화", "매트릭스", "접속", "과부하", "기계", "신호"],
  "자연 풍경": ["숲속", "폭포", "계곡", "호수", "정상", "들판", "언덕", "동굴", "섬", "바다", "사막", "빙하", "대지", "지평선", "강줄기", "습지", "밀림", "초원", "절벽", "분지"],
  "세계 여행": ["여권", "항공권", "캐리어", "지도", "기념품", "숙소", "호텔", "관광", "축제", "휴가", "경유", "직항", "환전", "배낭", "캠핑", "가이드", "명소", "휴양지", "유적지", "랜드마크"],
  "학교 생활": ["교실", "칠판", "급식", "교복", "선생님", "학생", "공부", "시험", "방학", "교과서", "필기", "동아리", "축제", "체육", "도서관", "운동장", "수업", "졸업", "입학", "쉬는시간"],
  "동물원": ["사자", "호랑이", "코끼리", "기린", "얼룩말", "팬더", "펭귄", "원숭이", "사슴", "곰", "늑대", "여우", "토끼", "다람쥐", "낙타", "캥거루", "하마", "악어", "독수리", "공작"],
  "병원": ["의사", "간호사", "환자", "수술", "약국", "처방", "주사", "치료", "검사", "진료", "병동", "구급차", "혈액", "맥박", "혈압", "심장", "건강", "예방", "재활", "안정"],
  "마트 장보기": ["카트", "바구니", "할인", "영수증", "포인트", "우유", "달걀", "고기", "채소", "과일", "생수", "라면", "과자", "음료", "세제", "휴지", "봉투", "매대", "계산대", "배달"],
  "꽃": ["장미", "튤립", "백합", "국화", "해바라기", "코스모스", "진달래", "벚꽃", "무궁화", "민들레", "라벤더", "카네이션", "수선화", "연꽃", "목련", "채송화", "분꽃", "나팔꽃", "안개꽃", "프리지아"],
  "과일": ["사과", "배", "포도", "딸기", "바나나", "수박", "참외", "복숭아", "자두", "귤", "오렌지", "망고", "키위", "파인애플", "멜론", "체리", "블루베리", "감", "밤", "대추"],
  "교통 수단": ["자동차", "기차", "비행기", "배", "자전거", "버스", "택시", "지하철", "오토바이", "헬기", "유람선", "트럭", "승합차", "킥보드", "뗏목", "마차", "인력거", "전동차", "구급차", "소방차"],
  "가구": ["침대", "책상", "의자", "소파", "옷장", "선반", "식탁", "화장대", "서랍장", "책장", "거울", "탁자", "벤치", "장식장", "신발장", "침실", "거실", "부엌", "안방", "서재"],
  "주방 도구": ["냄비", "프라이팬", "칼", "도마", "가위", "집게", "국자", "수저", "그릇", "접시", "컵", "수저통", "밥솥", "렌지", "믹서기", "주전자", "오븐", "식기", "행주", "수세미"],
  "직업": ["경찰", "소방관", "군인", "요리사", "화가", "가수", "배우", "작가", "운동선수", "변호사", "판사", "기자", "프로게이머", "과학자", "기술자", "농부", "어부", "조종사", "승무원", "디자이너"],
  "색상": ["빨강", "파랑", "노랑", "초록", "보라", "주황", "분홍", "하양", "검정", "회색", "갈색", "연두", "남색", "금색", "은색", "청록", "보라", "자주", "연보라", "살구색"],
  "학용품": ["연필", "지우개", "볼펜", "공책", "필통", "가위", "풀", "테이프", "자", "샤프", "색연필", "사인펜", "형광펜", "스케치북", "물감", "붓", "팔레트", "컴퍼스", "색종이", "스티커"],
  "곤충": ["나비", "벌", "개미", "잠자리", "무당벌레", "매미", "귀뚜라미", "사마귀", "장수풍뎅이", "사슴벌레", "파리", "모기", "거미", "지네", "전갈", "방아깨비", "번데기", "애벌레", "누에", "반딧불이"],
  "영화 장르": ["공포", "스릴러", "액션", "코미디", "멜로", "로맨스", "SF", "판타지", "애니", "다큐", "범죄", "추리", "미스터리", "사극", "무협", "전쟁", "음악", "가족", "느와르", "서부극"],
  "취미": ["독서", "영화감상", "음악듣기", "등산", "낚시", "그림", "사진", "요리", "게임", "수집", "악기", "운동", "여행", "원예", "캠핑", "공예", "춤", "글쓰기", "십자수", "바둑"],
  "도시 건물": ["빌딩", "아파트", "카페", "식당", "백화점", "은행", "우체국", "도서관", "미술관", "극장", "학교", "공원", "정류장", "약국", "주유소", "호텔", "교회", "성당", "사찰", "시장"],
  "감정": ["기쁨", "슬픔", "분노", "놀람", "공포", "행복", "우울", "긴장", "설렘", "감동", "지루함", "짜증", "안도", "뿌듯함", "그리움", "후회", "질투", "미안함", "고마움", "사랑"],
  "과학 분야": ["물리", "화학", "생물", "지구과학", "천문", "수학", "의학", "약학", "공학", "심리", "사회학", "경제학", "정치학", "언어학", "철학", "역사학", "지리학", "통계학", "윤리학", "미학"],
  "계절": ["봄", "여름", "가을", "겨울", "입춘", "우수", "경칩", "춘분", "청명", "곡우", "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서", "백로", "추분"],
  "옷": ["티셔츠", "바지", "치마", "원피스", "코트", "자켓", "니트", "셔츠", "조끼", "가디건", "패딩", "청바지", "교복", "한복", "정장", "잠옷", "속옷", "양말", "장갑", "목도리"],
  "액세서리": ["모자", "가방", "지갑", "안경", "시계", "반지", "목걸이", "귀걸이", "팔찌", "벨트", "넥타이", "머리핀", "리본", "브로치", "우산", "선글라스", "스카프", "장화", "운동화", "구두"],
  "무술": ["태권도", "유도", "검도", "합기도", "가라테", "권투", "레슬링", "우슈", "킥복싱", "무에타이", "씨름", "펜싱", "주짓수", "궁도", "양궁", "사격", "택견", "영춘권", "절권도", "태극권"],
  "산책로": ["나무", "벤치", "분수", "잔디", "꽃밭", "호수", "조깅", "강아지", "운동", "그늘", "공원", "숲", "오솔길", "계단", "다리", "바람", "풍경", "휴식", "여가", "자전거"],
  "캠핑용품": ["텐트", "침낭", "랜턴", "버너", "코펠", "의자", "테이블", "해먹", "그릴", "아이스박스", "장작", "망치", "매트", "침대", "베개", "보온병", "방수포", "가방", "밧줄", "구급함"],
  "판타지": ["용", "마법", "기사", "공주", "요정", "엘프", "드워프", "오크", "마왕", "던전", "보물", "검", "방패", "물약", "주문", "성", "전설", "영웅", "모험", "동료"],
  "무협": ["강호", "문파", "신공", "검객", "무림", "비급", "정파", "사파", "내공", "경공", "혈투", "명성", "사부", "제자", "객잔", "표국", "강호", "은원", "결투", "복수"],
  "르네상스": ["레오나르도", "미켈란젤로", "다빈치", "예술", "유화", "조각", "인문학", "이탈리아", "피렌체", "교황", "귀족", "천재", "발명", "원근법", "조화", "균형", "고전", "인간", "자연", "철학"],
  "올림픽": ["금메달", "은메달", "동메달", "성화", "개최", "경기", "선수", "심판", "코치", "관객", "응원", "국기", "시상대", "기록", "역전", "투혼", "우정", "평화", "축제", "감동"],
  "대중교통": ["버스", "지하철", "택시", "정거장", "노선", "환승", "요금", "카드", "도착", "출발", "좌석", "손잡이", "벨", "안내", "기관사", "승객", "붐빔", "여유", "출근", "퇴근"],
  "가전제품": ["냉장고", "세탁기", "에어컨", "TV", "청소기", "전자레인지", "공기청정기", "가습기", "드라이기", "전기밥솥", "전기포트", "다리미", "오디오", "스피커", "전구", "스위치", "콘센트", "리모컨", "배터리", "충전기"],
  "생일": ["케이크", "촛불", "선물", "축하", "파티", "노래", "친구", "가족", "카드", "초대", "풍선", "음식", "미역국", "추억", "사진", "웃음", "기쁨", "감동", "깜짝", "행복"],
  "디저트": ["마카롱", "케이크", "쿠키", "빵", "푸딩", "아이스크림", "초콜릿", "사탕", "젤리", "타르트", "도넛", "와플", "팬케이크", "머핀", "치즈케이크", "브라우니", "빙수", "파이", "슈크림", "에클레어"],
  "차와 커피": ["아메리카노", "라떼", "에스프레소", "녹차", "홍차", "유자차", "보리차", "둥굴레차", "카페인", "원두", "찻잎", "머그컵", "찻잔", "티스푼", "시럽", "우유", "설탕", "향기", "티타임", "여유"],
  "전래동화": ["호랑이", "곶감", "토끼", "거북이", "선녀", "나무꾼", "도깨비", "방망이", "심청", "흥부", "놀부", "박", "제비", "효도", "우애", "권선징악", "옛날이야기", "할머니", "무릎", "추억"],
  "동네 시장": ["떡볶이", "순대", "튀김", "어묵", "야채", "생선", "과일", "할인", "흥정", "덤", "정", "인심", "활기", "좌판", "가게", "상인", "손님", "장바구니", "간식", "나들이"],
  "수학": ["덧셈", "뺄셈", "곱셈", "나눗셈", "숫자", "도형", "함수", "방정식", "기하", "확률", "통계", "집합", "수열", "삼각형", "사각형", "원", "공식", "증명", "논리", "해답"],
  "문학": ["소설", "시", "수필", "희곡", "작가", "시인", "문장", "단어", "표현", "감상", "비평", "출판", "책", "도서관", "독자", "줄거리", "주제", "복선", "반전", "여운"],
  "미술": ["도화지", "물감", "붓", "파스텔", "크레용", "연필", "스케치", "데생", "수채화", "유화", "동양화", "풍경화", "인물화", "정물화", "추상화", "조각", "공예", "전시회", "화가", "미술관"],
  "춤": ["발레", "현대무용", "한국무용", "힙합", "브레이크", "팝핀", "재즈댄스", "왈츠", "탱고", "살사", "탭댄스", "안무", "리듬", "스텝", "회전", "점프", "무대", "조명", "박수", "열정"],
  "악기": ["피아노", "바이올린", "첼로", "플루트", "클라리넷", "트럼펫", "기타", "드럼", "하프", "해금", "가야금", "거문고", "대금", "피리", "장구", "북", "꽹과리", "징", "멜로디언", "실로폰"],
  "바다": ["파도", "모래사장", "갈매기", "등대", "수평선", "갯벌", "해수욕", "튜브", "수영복", "선글라스", "조개", "불가사리", "상어", "고래", "배", "항구", "섬", "바닷바람", "소금", "짠맛"],
  "산": ["바위", "나무", "계곡", "다람쥐", "등산화", "지팡이", "배낭", "정상", "야호", "구름", "안개", "단풍", "눈꽃", "산불", "약수터", "절", "산장", "지도", "침엽수", "활엽수"],
  "하늘": ["태양", "달", "별", "구름", "무지개", "노을", "번개", "천둥", "비", "눈", "바람", "안개", "비행기", "새", "연", "풍선", "우주", "은하수", "공기", "푸른색"],
  "봄": ["새싹", "꽃샘추위", "개나리", "진달래", "벚꽃", "나비", "벌", "황사", "입춘", "산나물", "냉이", "달래", "춘곤증", "입학", "소풍", "따뜻함", "시작", "생명", "아지랑이", "들꽃"],
  "여름": ["더위", "매미", "수박", "선풍기", "에어컨", "냉면", "빙수", "바다", "계곡", "장마", "태풍", "방학", "휴가", "모기", "땀", "햇볕", "파란색", "얼음", "그늘", "폭포"],
  "가을": ["단풍", "은행나무", "코스모스", "높은하늘", "천고마비", "추석", "송편", "결실", "수확", "농부", "허수아비", "잠자리", "독서", "편지", "그리움", "쓸쓸함", "바바리코트", "낙엽", "찬바람", "겨울준비"],
  "겨울": ["추위", "눈", "얼음", "고드름", "눈사람", "썰매", "스케이트", "스키", "크리스마스", "산타", "난로", "목도리", "장갑", "털모자", "호빵", "붕어빵", "귤", "동면", "연말", "새해"],
  "크리스마스": ["산타", "루돌프", "썰매", "트리", "장식", "전구", "캐럴", "선물", "카드", "축제", "파티", "케이크", "촛불", "눈", "추위", "기쁨", "사랑", "가족", "친구", "추억"],
  "할로윈": ["호박", "유령", "박쥐", "거미줄", "사탕", "분장", "가면", "파티", "공포", "깜짝", "마녀", "빗자루", "해골", "늑대인간", "뱀파이어", "무덤", "검은고양이", "깜깜함", "초콜릿", "축제"],
  "여행": ["지도", "가이드북", "카메라", "기념품", "풍경", "체험", "맛집", "휴식", "새로움", "인연", "공항", "역", "터미널", "비행기", "기차", "버스", "걷기", "웃음", "사진", "일기"],
  "성격": ["착함", "밝음", "조용함", "활발함", "성실함", "꼼꼼함", "급함", "느긋함", "다정함", "솔직함", "용기", "지혜", "끈기", "배려", "정직", "겸손", "자신감", "열정", "창의력", "책임감"],
  "가족": ["할아버지", "할머니", "아버지", "어머니", "형", "누나", "오빠", "언니", "동생", "삼촌", "고모", "이모", "조카", "손자", "사랑", "행복", "추억", "집", "식사", "화목"],
  "친구": ["우정", "의리", "대화", "놀이", "비밀", "고민", "위로", "즐거움", "만남", "이별", "학교", "동네", "취미", "공감", "소통", "신뢰", "편지", "사진", "추억", "영원"],
  "사랑": ["설렘", "고백", "연애", "결혼", "약속", "선물", "데이트", "꽃다발", "편지", "하트", "반지", "추억", "믿음", "행복", "그리움", "희생", "배려", "영원", "진심", "기다림"],
  "공부": ["학교", "교실", "책상", "책", "공책", "연필", "지우개", "칠판", "숙제", "시험", "점수", "노력", "성장", "배움", "꿈", "지식", "도서관", "선생님", "집중", "인내"],
  "학교": ["교문", "운동장", "교실", "도서관", "음악실", "미술실", "과학실", "체육관", "급식소", "매점", "칠판", "교탁", "학생", "선생님", "친구", "수업", "종소리", "방학", "축제", "졸업"],
  "교실": ["책상", "의자", "칠판", "분필", "교탁", "게시판", "사물함", "청소도구", "시간표", "급훈", "학생", "선생님", "교과서", "필기구", "가방", "정수기", "창문", "커튼", "시계", "달력"],
  "운동장": ["축구대", "농구대", "철봉", "미끄럼틀", "그네", "시소", "모래사장", "트랙", "스탠드", "조회대", "공", "줄넘기", "달리기", "응원", "땀", "활기", "친구", "놀이", "점심시간", "방과후"],
  "도서관": ["책장", "책", "사서", "열람실", "대출", "반납", "검색", "정숙", "공부", "독서", "지혜", "지식", "평온", "책냄새", "신간", "고전", "잡지", "신문", "학생", "꿈"],
  "급식": ["식판", "수저", "밥", "국", "반찬", "김치", "우유", "간식", "줄서기", "상호작용", "영양사", "조리사", "맛", "배부름", "즐거움", "친구", "이야기", "잔반", "청결", "예절"],
  "매점": ["과자", "빵", "우유", "음료수", "라면", "간식", "학용품", "돈", "거스름돈", "쉬는시간", "인기", "친구", "수다", "줄서기", "활기", "추억", "맛", "허기", "기쁨", "친절"],
  "집": ["현관", "거실", "부엌", "침실", "화장실", "베란다", "가족", "휴식", "식사", "수면", "TV", "컴퓨터", "책상", "침대", "소파", "사랑", "평온", "추억", "따뜻함", "안식처"],
  "거실": ["소파", "TV", "탁자", "에어컨", "공기청정기", "액자", "화분", "카페트", "전등", "커튼", "리모컨", "이야기", "휴식", "가족", "수다", "간식", "여유", "평화", "따뜻함", "모임"],
  "부엌": ["냉장고", "싱크대", "가스레인지", "식탁", "의자", "냄비", "프라이팬", "그릇", "수저", "칼", "도마", "요리", "식사", "음식냄새", "설거지", "엄마", "정성", "맛", "배부름", "대화"],
  "침실": ["침대", "이불", "베개", "옷장", "화장대", "서랍장", "스탠드", "잠", "꿈", "휴식", "포근함", "어두움", "조용함", "알람시계", "독서", "생각", "정리", "아침", "밤", "평온"],
  "화장실": ["변기", "세면대", "욕조", "샤워기", "거울", "수건", "비누", "샴푸", "치약", "칫솔", "양치", "세수", "목욕", "청결", "시원함", "물소리", "슬리퍼", "휴지", "화장품", "개운함"],
  "공원": ["나무", "잔디", "꽃", "벤치", "산책로", "운동기구", "놀이터", "분수", "호수", "조형물", "산책", "조깅", "강아지", "자전거", "가족", "연인", "아이들", "휴식", "바람", "자연"],
  "놀이터": ["미끄럼틀", "그네", "시소", "정글짐", "모래놀이", "아이들", "웃음", "놀이", "활기", "모험", "술래잡기", "땀", "친구", "성장", "즐거움", "자유", "상상력", "추억", "엄마", "해질녘"],
  "마트": ["카트", "바구니", "진열대", "물건", "식료품", "생필품", "할인", "시식", "계산대", "영수증", "포장", "장보기", "사람들", "활기", "선택", "생활", "가족", "편리함", "친절", "배달"],
  "편의점": ["24시", "간편함", "도시락", "삼각김밥", "컵라면", "음료수", "과자", "택배", "ATM", "친절", "언제나", "가까움", "필요", "유행", "신상품", "학생", "혼밥", "생활", "밝음", "깔끔"],
  "지하철": ["노선도", "개찰구", "승강장", "스크린도어", "좌석", "손잡이", "안내방송", "사람들", "출퇴근", "약속", "이동", "빠름", "정확함", "스마트폰", "독서", "잠", "풍경", "환승", "역사", "에스컬레이터"],
  "버스": ["정류장", "노선", "번호", "좌석", "손잡이", "하차벨", "운전기사", "승객", "창밖", "풍경", "이동", "여유", "약속", "교통카드", "친절", "인사", "정겨움", "생활", "연결", "안전"],
  "택시": ["호출", "승차", "하차", "기사님", "목적지", "빠름", "편안함", "요금", "미터기", "영수증", "밤길", "귀가", "급함", "친절", "대화", "프라이빗", "이동", "생활", "지도", "길찾기"],
  "기차": ["역", "플랫폼", "기차표", "좌석", "창밖", "풍경", "여행", "설렘", "빠름", "장거리", "고향", "가족", "친구", "도시락", "간식", "독서", "음악", "생각", "추억", "도착"],
  "비행기": ["공항", "여권", "탑승구", "좌석", "창밖", "구름", "여행", "해외", "하늘", "기내식", "승무원", "조종사", "빠름", "설렘", "긴장", "도착", "새로운세상", "추억", "사진", "일기"],
  "도서": ["제목", "저자", "목차", "내용", "그림", "문장", "지식", "지혜", "감동", "재미", "위로", "깨달음", "독서", "성장", "꿈", "상상", "친구", "선물", "인생", "영원"],
  "자전거": ["바퀴", "안장", "핸들", "페달", "체인", "브레이크", "벨", "헬멧", "라이딩", "운동", "산책", "바람", "풍경", "자유", "속도", "환경", "건강", "취미", "친구", "추억"],
  "등산": ["정상", "바위", "나무", "계곡", "다람쥐", "지팡이", "배낭", "땀", "뿌듯함", "경치", "야호", "맑은공기", "인내", "도전", "성취", "자연", "휴식", "건강", "친구", "막걸리"],
  "수영": ["수영장", "바다", "물", "수영복", "수경", "수영모", "준비운동", "호흡", "스트로크", "킥", "다이빙", "시원함", "건강", "자유", "즐거움", "여름", "운동", "안전", "성장", "추억"]
};

const App: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [currentTheme, setCurrentTheme] = useState('');
  const [isLobby, setIsLobby] = useState(true);
  const [score, setScore] = useState(0);
  const [comboPoints, setComboPoints] = useState<number | null>(null);
  const [board, setBoard] = useState<(GameObject | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null))
  );
  const [movingObject, setMovingObject] = useState<GameObject | null>(null);
  const [nextWord, setNextWord] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [nextSpawnTimer, setNextSpawnTimer] = useState<number | null>(null);
  const [gameWordPool, setGameWordPool] = useState<string[]>([]);
  const [wordColorMap, setWordColorMap] = useState<Record<string, string>>({});
  const [topRankings, setTopRankings] = useState<Ranking[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  const spawnTimerRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);

  const fetchRankings = async () => {
    setIsLoadingRankings(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rankings?select=name,score,theme&order=score.desc&limit=5`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      setTopRankings(Array.isArray(data) ? data : []);
    } catch (error) {} finally { setIsLoadingRankings(false); }
  };

  const updateRanking = async (finalScore: number, finalTheme: string) => {
    if (!playerName.trim() || gameWordPool.length === 0) return;
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rankings?name=eq.${encodeURIComponent(playerName)}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const existing = await checkRes.json();
      let response;
      if (Array.isArray(existing) && existing.length > 0) {
        if (finalScore > existing[0].score) {
          response = await fetch(`${SUPABASE_URL}/rest/v1/rankings?name=eq.${encodeURIComponent(playerName)}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore, theme: finalTheme })
          });
        }
      } else {
        response = await fetch(`${SUPABASE_URL}/rest/v1/rankings`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, score: finalScore, theme: finalTheme })
        });
      }
      if (response && response.status === 403) setDbErrorMessage("점수 저장 실패: DB 권한 오류");
      fetchRankings();
    } catch (error) {}
  };

  const applyGravityToBoard = (currentBoard: (GameObject | null)[][]) => {
    for (let c = 0; c < COLUMNS; c++) {
      let writeIdx = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (currentBoard[r][c] !== null) {
          if (writeIdx !== r) {
            currentBoard[writeIdx][c] = { ...currentBoard[r][c]!, row: writeIdx };
            currentBoard[r][c] = null;
          }
          writeIdx--;
        }
      }
    }
  };

  const getConnections = (targetBoard: (GameObject | null)[][], r: number, c: number) => {
    const startObj = targetBoard[r][c];
    if (!startObj) return [];
    const word = startObj.word;
    const connected: { r: number, c: number }[] = [];
    const visited = new Set<string>();
    const queue = [{ r, c }];
    visited.add(`${r},${c}`);
    while (queue.length > 0) {
      const { r: cr, c: cc } = queue.shift()!;
      connected.push({ r: cr, c: cc });
      const neighbors = [{ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 }];
      for (const next of neighbors) {
        if (next.r >= 0 && next.r < ROWS && next.c >= 0 && next.c < COLUMNS && !visited.has(`${next.r},${next.c}`) && targetBoard[next.r][next.c]?.word === word) {
          visited.add(`${next.r},${next.c}`);
          queue.push(next);
        }
      }
    }
    return connected;
  };

  const processChainReactions = (currentBoard: (GameObject | null)[][]): { board: (GameObject | null)[][], points: number } => {
    let totalPoints = 0;
    let chainFound = true;
    while (chainFound) {
      chainFound = false;
      const toRemove = new Set<string>();
      const visitedForMatch = new Set<string>();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
          if (currentBoard[r][c] && !visitedForMatch.has(`${r},${c}`)) {
            const group = getConnections(currentBoard, r, c);
            if (group.length >= 3) {
              group.forEach(pos => { toRemove.add(`${pos.r},${pos.c}`); visitedForMatch.add(`${pos.r},${pos.c}`); });
              totalPoints += (40 + (group.length - 3) * 10);
              chainFound = true;
            } else {
              group.forEach(pos => visitedForMatch.add(`${pos.r},${pos.c}`));
            }
          }
        }
      }
      if (chainFound) {
        toRemove.forEach(key => { const [r, c] = key.split(',').map(Number); currentBoard[r][c] = null; });
        applyGravityToBoard(currentBoard);
      }
    }
    return { board: currentBoard, points: totalPoints };
  };

  const spawnObject = useCallback(() => {
    setBoard(currentBoard => {
      if (gameOver || isLobby || gameWordPool.length === 0) return currentBoard;
      const spawnCol = Math.floor(Math.random() * COLUMNS);
      if (currentBoard[0][spawnCol] !== null) {
        setGameOver(true);
        return currentBoard;
      }
      setNextWord(prevNext => {
        const wordToSpawn = prevNext || gameWordPool[Math.floor(Math.random() * gameWordPool.length)];
        const newObj: GameObject = {
          id: Math.random().toString(36).substr(2, 9),
          word: wordToSpawn, col: spawnCol, row: 0, status: 'moving',
          color: wordColorMap[wordToSpawn] || 'bg-slate-500'
        };
        setMovingObject(newObj);
        return gameWordPool[Math.floor(Math.random() * gameWordPool.length)];
      });
      return currentBoard;
    });
  }, [gameOver, isLobby, gameWordPool, wordColorMap]);

  const startSpawnCountdown = useCallback(() => {
    if (gameWordPool.length === 0) return;
    setNextSpawnTimer(1);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    spawnTimerRef.current = window.setInterval(() => {
      setNextSpawnTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(spawnTimerRef.current!);
          spawnObject();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameWordPool, spawnObject]);

  const landObject = useCallback((obj: GameObject) => {
    if (gameOver) return;
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      if (obj.row < 0 || (newBoard[obj.row] && newBoard[obj.row][obj.col] !== null)) {
        setGameOver(true);
        return prevBoard;
      }
      newBoard[obj.row][obj.col] = { ...obj, status: 'fixed' };
      const { board: clearedBoard, points } = processChainReactions(newBoard);
      if (points > 0) {
        setScore(s => {
          const newTotal = s + points;
          setComboPoints(points);
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = window.setTimeout(() => setComboPoints(null), 1500);
          return newTotal;
        });
      }
      setMovingObject(null);
      startSpawnCountdown();
      return clearedBoard;
    });
  }, [gameOver, startSpawnCountdown]);

  useEffect(() => {
    if (!movingObject || gameOver) return;
    const fallStepTime = FALL_DURATION / ROWS;
    const ticker = setInterval(() => {
      setMovingObject(prev => {
        if (!prev) return null;
        const nextRow = prev.row + 1;
        if (nextRow < ROWS && board[nextRow][prev.col] === null) return { ...prev, row: nextRow };
        clearInterval(ticker);
        landObject(prev);
        return null;
      });
    }, fallStepTime);
    return () => clearInterval(ticker);
  }, [movingObject === null, gameOver, board, landObject]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wordToMatch = inputValue.trim();
    if (!wordToMatch) return;
    let targetDeletedInBoard = false;
    let totalPointsGained = 0;
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      let targetFound = false;
      for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLUMNS; c++) {
          if (newBoard[r][c]?.word === wordToMatch) {
            newBoard[r][c] = null;
            totalPointsGained += 10;
            targetFound = true; targetDeletedInBoard = true;
            r = -1; c = COLUMNS; 
          }
        }
      }
      if (targetFound) {
        applyGravityToBoard(newBoard);
        const { board: clearedBoard, points } = processChainReactions(newBoard);
        totalPointsGained += points;
        setScore(s => s + totalPointsGained);
        if (totalPointsGained > 10) {
          setComboPoints(totalPointsGained);
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = window.setTimeout(() => setComboPoints(null), 1500);
        }
        return clearedBoard;
      }
      return prevBoard;
    });
    if (!targetDeletedInBoard && movingObject?.word === wordToMatch) {
      setMovingObject(null);
      setScore(s => { const ns = s + 10; startSpawnCountdown(); return ns; });
    }
    setInputValue('');
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    
    // 100개 테마 중 무작위 선정
    const themeNames = Object.keys(THEME_DB);
    const chosenTheme = themeNames[Math.floor(Math.random() * themeNames.length)];
    setCurrentTheme(chosenTheme);
    
    // 해당 테마의 20단어 중 14개 무작위 선정
    const allWords = [...THEME_DB[chosenTheme]];
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    const pool = shuffled.slice(0, 14);
    
    const colorMap: Record<string, string> = {};
    pool.forEach((w, i) => { colorMap[w] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    
    setGameWordPool(pool);
    setWordColorMap(colorMap);
    setNextWord(pool[Math.floor(Math.random() * pool.length)]);
    setIsLobby(false);
    setGameOver(false);
    setScore(0);
    setBoard(Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null)));
    setMovingObject(null);
    setNextSpawnTimer(null);
    setDbErrorMessage(null);
  };

  const resetToLobby = () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    setIsLobby(true);
    setGameOver(false);
    setScore(0);
    setMovingObject(null);
    setNextSpawnTimer(null);
    setInputValue('');
    setGameWordPool([]);
  };

  useEffect(() => { fetchRankings(); }, []);
  useEffect(() => {
    if (!isLobby && gameWordPool.length > 0 && !movingObject && nextSpawnTimer === null && !gameOver) spawnObject();
  }, [isLobby, gameWordPool.length, movingObject === null, nextSpawnTimer === null, gameOver, spawnObject]);

  useEffect(() => { 
    if (gameOver && gameWordPool.length > 0) updateRanking(score, currentTheme); 
  }, [gameOver]);

  if (isLobby) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-blue-400">WORD DROP</h1>
            <p className="text-slate-400 font-medium tracking-widest uppercase">100 Themes Edition</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 uppercase tracking-widest">
              <i className="fa-solid fa-trophy text-amber-400"></i> Hall of Fame
            </h2>
            <div className="space-y-3 mb-8">
              {isLoadingRankings ? (
                <div className="text-slate-500 animate-pulse text-xs uppercase font-black">Loading...</div>
              ) : topRankings.length > 0 ? (
                topRankings.map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500' : 'bg-slate-500'}`}>{i + 1}</span>
                      <div className="text-left">
                        <div className="font-bold text-slate-200 text-sm">{r.name}</div>
                        <div className="text-[9px] text-slate-500 uppercase">{r.theme || 'Basic'}</div>
                      </div>
                    </div>
                    <span className="font-black text-blue-400">{r.score}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs">No records yet.</div>
              )}
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="PLAYER NAME" value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 10))} className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-4 px-6 text-xl font-bold text-center tracking-widest focus:outline-none focus:border-blue-500 transition-all"/>
              <button onClick={startGame} disabled={!playerName.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl text-lg tracking-widest uppercase">
                START GAME
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Local Data Only • 100 Unique Themes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex justify-between items-end mb-4 px-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Theme: {currentTheme}</span>
          </div>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{playerName}</span>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Next</div>
            {nextWord && (
              <div className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${wordColorMap[nextWord]}`}>
                ? ? ?
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Score</div>
            <div className="text-2xl font-black text-white">{score}</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div 
          className="relative bg-slate-800/80 backdrop-blur-xl border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: '300px', height: '500px', display: 'grid', gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
        >
          {comboPoints !== null && (
            <div className="absolute top-1/3 left-0 w-full text-center z-50 pointer-events-none animate-bounce">
              <span className="text-5xl font-black text-amber-400 drop-shadow-lg">+{comboPoints}</span>
              <div className="text-xs font-black text-white uppercase tracking-widest">CHAIN!</div>
            </div>
          )}

          {board.map((row, r) => row.map((cell, c) => cell && (
            <div key={cell.id} className="absolute grid-step-transition flex items-center justify-center text-[11px] font-black p-1 rounded-lg shadow-lg ring-1 ring-white/10 text-white truncate"
              style={{ width: `${100 / COLUMNS}%`, height: `${100 / ROWS}%`, top: `${(r / ROWS) * 100}%`, left: `${(c / COLUMNS) * 100}%`, backgroundColor: cell.color.replace('bg-', '') }}>
              <div className={`w-full h-full flex items-center justify-center rounded ${cell.color}`}>{cell.word}</div>
            </div>
          )))}

          {movingObject && (
            <div className="absolute grid-step-transition flex items-center justify-center text-[11px] font-black p-1 rounded-lg shadow-2xl ring-2 ring-white/30 text-white z-10"
              style={{ width: `${100 / COLUMNS}%`, height: `${100 / ROWS}%`, left: `${(movingObject.col / COLUMNS) * 100}%`, top: `${(movingObject.row / ROWS) * 100}%` }}>
              <div className={`w-full h-full flex items-center justify-center rounded ${movingObject.color} animate-pulse`}>{movingObject.word}</div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
              <i className="fa-solid fa-skull-crossbones text-5xl text-rose-500 mb-4"></i>
              <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Terminated</h2>
              <p className="text-slate-400 mb-2 font-bold uppercase tracking-widest">Final Score: {score}</p>
              {dbErrorMessage && <div className="text-rose-400 text-[9px] mb-4 uppercase">{dbErrorMessage}</div>}
              <div className="flex flex-col gap-3 w-40">
                <button onClick={startGame} className="py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase hover:bg-blue-500 transition-colors">Replay</button>
                <button onClick={resetToLobby} className="py-3 bg-slate-700 text-white font-black rounded-xl text-xs uppercase hover:bg-slate-600 transition-colors">Menu</button>
              </div>
            </div>
          )}
        </div>

        {!movingObject && !gameOver && !isLobby && nextSpawnTimer !== null && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-slate-400 font-bold text-[9px] uppercase tracking-widest bg-slate-900/80 px-4 py-1 rounded-full border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in duration-200">
            Next Word in {nextSpawnTimer}s
          </div>
        )}
      </div>

      <div className="mt-6 w-full max-w-sm">
        <form onSubmit={handleInputSubmit} className="relative mb-4">
          <input type="text" placeholder="TYPE THE FALLING WORD..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={gameOver}
            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl py-4 px-6 text-lg font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all shadow-inner" autoFocus/>
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 px-4 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors">
            <i className="fa-solid fa-bolt"></i>
          </button>
        </form>
        <div className="text-center text-[10px] text-slate-500 font-black uppercase tracking-widest">
           Discover words through gameplay!
        </div>
      </div>
    </div>
  );
};

export default App;
