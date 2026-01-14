
function verifyLogic() {
    const testCases = [
        { text: "이 문항에서는 '전혀 그렇지 않다'를 선택하십시오.", expected: 1 },
        { text: "현재 읽고 있는 문항에는 '그렇지 않다'를 선택하십시오.", expected: 2 },
        { text: "이 문항에서는 '보통이다'을 선택하십시오.", expected: 3 },
        { text: "해당 문항에서는 '그렇다'를 선택하십시오.", expected: 4 },
        { text: "이 문항에서는 '매우 그렇다'를 선택하십시오.", expected: 5 }
    ];

    console.log("Verifying Non-Compliance Logic matching...");

    let allPass = true;
    testCases.forEach((tc, i) => {
        let target = -1;
        // Logic from ReliabilityAnalysis.tsx
        if (tc.text.includes("'매우 그렇다'")) target = 5;
        else if (tc.text.includes("'그렇다'")) target = 4;
        else if (tc.text.includes("'보통'") || tc.text.includes("'보통이다'")) target = 3;
        else if (tc.text.includes("'전혀 그렇지 않다'")) target = 1;
        else if (tc.text.includes("'그렇지 않다'")) target = 2;

        const pass = target === tc.expected;
        console.log(`[${i + 1}] "${tc.text}" -> Predicted: ${target}, Expected: ${tc.expected} [${pass ? 'PASS' : 'FAIL'}]`);
        if (!pass) allPass = false;
    });

    if (allPass) console.log("\nALL TESTS PASSED: Logic matches user requirements.");
    else console.log("\nSOME TESTS FAILED: Logic needs adjustment.");
}

verifyLogic();
