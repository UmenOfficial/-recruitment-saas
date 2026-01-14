
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const articleBody = `
<h3>인성검사, 왜 '탈락의 쓴맛'만 기억하나요?</h3>
<p>
    많은 취업준비생들이 인성검사를 '떨어뜨리기 위한 관문'으로만 생각합니다. 
    하지만 <strong style="color: #4f46e5;">U.men</strong>의 생각은 다릅니다. 
    인성검사는 여러분을 탈락시키기 위한 도구가 아니라, 
    <strong>여러분이 어떤 사람인지 가장 객관적으로 보여주는 '데이터'</strong>입니다.
</p>
<br/>

<h3>1. Deep Dive 리포트: 나의 '진짜' 모습을 마주하다</h3>
<p>
    U.men의 결과 리포트는 단순한 합격/불합격 통보가 아닙니다. 
    빅파이브(Big 5) 성격 이론을 기반으로 여러분의 성향을 
    구체적인 <strong>역량(Competency)</strong> 점수로 변환하여 보여줍니다.
</p>
<ul>
    <li><strong>강점 발견:</strong> 내가 무의식적으로 발휘하던 능력이 데이터로 증명됩니다. 자소서에 "저는 성실합니다"라고 쓰는 대신, "책임감 역량 상위 5%의 끈기를 가지고 있습니다"라고 말할 수 있게 되죠.</li>
    <li><strong>보완점 확인:</strong> 반사회성, 충동성 등 조직 생활에 리스크가 될 수 있는 요인들을 미리 체크하고 스스로를 다잡을 수 있습니다.</li>
</ul>
<br/>

<h3>2. '반복 응시'가 필요한 이유: 멘탈도 관리가 되나요?</h3>
<p>
    성격은 변하지 않지만, 검사에 임하는 <strong>'마음가짐'과 '상태'</strong>는 매일 변합니다.
    U.men 검사를 여러 번 응시해보는 것은 마치 거울을 여러 번 보며 옷매무새를 다듬는 것과 같습니다.
</p>
<div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 10px 0;">
    <p style="margin: 0; font-weight: bold;">💡 반복 응시 체크포인트</p>
    <ul style="margin-top: 10px;">
        <li><strong>컨디션에 따른 변화:</strong> 긴장했을 때와 편안할 때 나의 답변 패턴이 어떻게 달라지는지 확인하세요.</li>
        <li><strong>의도적인 왜곡(Fake) 탐지:</strong> "좋게 보이려고" 답변을 꾸며냈을 때, 오히려 '신뢰도 점수'가 어떻게 떨어지는지 경험해보세요. 솔직함이 최고의 전략임을 데이터로 깨닫게 됩니다.</li>
        <li><strong>일관성 확보:</strong> 여러 번의 테스트를 통해 어떤 상황에서도 흔들리지 않는 나의 'Core Value'가 무엇인지 찾아낼 수 있습니다.</li>
    </ul>
</div>
<br/>

<h3>3. 취업 준비의 새로운 전략, Self-Discovery</h3>
<p>
    면접관은 '완벽한 사람'을 뽑는 것이 아닙니다. 
    <strong>'자신을 잘 알고, 부족한 점을 개선하려 노력하는 사람'</strong>을 원합니다.
</p>
<p>
    U.men 리포트를 통해 발견한 나의 약점을 숨기려 하지 마세요. 
    "저는 과거에 급한 성격이 있었지만(데이터 확인), 이를 보완하기 위해 
    체크리스트를 활용하며 꼼꼼함을 길렀습니다(개선 노력)"라고 말할 때, 
    여러분의 이야기는 강력한 설득력을 얻습니다.
</p>
<br/>
<p style="text-align: center; font-weight: bold; color: #4f46e5;">
    지금 바로 U.men 인성검사로<br/>
    데이터가 증명하는 '나'를 만나보세요.
</p>
`;

async function insertArticle() {
    const { data, error } = await supabase
        .from('admin_contents')
        .insert({
            title: "나를 증명하는 데이터, U.men 인성검사 200% 활용법",
            type: "ARTICLE",
            summary: "단순한 합불 통보가 아닙니다. Deep Dive 리포트로 나의 강점을 찾고 데이터를 무기로 삼는 법.",
            body: articleBody,
            is_published: true,
            content_url: "" // Not used for Article as per findings
        })
        .select()
        .single();

    if (error) {
        console.error('Insert failed:', error);
    } else {
        console.log('Article inserted successfully:', data.id);
    }
}

insertArticle();
