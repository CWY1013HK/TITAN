import json


def main():
    with open('sample_input.json', 'r', encoding='utf-8') as f:
        userdata = json.load(f)
    with open('full_data_amended.json', 'r', encoding='utf-8') as f:
        database = json.load(f)
    code = userdata['code']
    scores = userdata['score']
    data = {item['code']: item for item in database}[code]
    print("Result: " + str(classify(scores, data)))

classification = {
    -1: 'Error',
    0: 'Mission Impossible',
    1: 'Dangerous',
    2: 'Very Risky',
    3: 'Risky',
    4: 'Moderate',
    5: 'Basically Safe',
    6: 'Safe',
    7: 'Very Safe',
    8: 'Secure'
}

def classify(scores, data):

    # Compulsory Requirements
    req_comp = data['requirement_compulsory']
    for req in req_comp:
        if req not in scores:
            return 0
        if scores[req] < req_comp[req]:
            return 0

    # First Optional Requirement
    fulfill = False
    elective_used = ''
    req_opt1 = data['requirement_optional_2']
    for req in req_opt1:
        if req == 'ELE':
            for ele in scores:
                if ele not in {'ENG', 'CHI', 'MAT'}:
                    if scores[ele] >= req_opt1[req]:
                        fulfill = True
                        elective_used = ele
                        break
        else:
            if req in scores:
                if scores[req] >= req_opt1[req]:
                    fulfill = True
                    if req != 'MAT':
                        elective_used = req
                        break
    if elective_used == '':
        for ele in scores:
            if ele not in {'ENG', 'CHI', 'MAT'}:
                if scores[ele] >= 3:
                    elective_used = ele
                    break
        fulfill = False
    if not fulfill:
        return 0

    # Second Optional Requirement
    fulfill = False
    req_opt2 = data['requirement_optional_1']
    for req in req_opt2:
        if req == 'ELE':
            if req != elective_used:
                for ele in scores:
                    if ele not in {'ENG', 'CHI', 'MAT'}:
                        if scores[ele] >= req_opt2[req]:
                            fulfill = True
                            elective_used = ele
                            break
        else:
            if req != elective_used:
                if req in scores:
                    if scores[req] >= req_opt2[req]:
                        fulfill = True
                        break
    if not fulfill:
        return 0

    # total_score Conversion
    level_5_bonus = data['level_5_bonus']
    if level_5_bonus:
        for sub in scores:
            if scores[sub] == 5:
                scores[sub] = 5.5
            elif scores[sub] == 6:
                scores[sub] = 7
            elif scores[sub] == 7:
                scores[sub] = 8.5

    # Score Calculation
    total_score = 0
    sub_used = set()
    sub_comp = data['subject_compulsory']
    sub_opt1 = data['subject_optional_1']
    sub_opt2 = data['subject_optional_2']
    sub_free = data['subject_free_number']
    sub_fwei = data['subject_free_weight']
    sub_wlim = data['subject_weight_limit']

    # Compulsory
    for sub in sub_comp:
        try:
            total_score += scores[sub] * sub_comp[sub]
            sub_used.add(sub)
        except:
            return -1
    print(total_score)

    # First Optional
    max_score = 0
    max_subject = ''
    for sub in sub_opt1:
        if sub in sub_used:
            continue
        try:
            weighted_score = scores[sub] * sub_opt1[sub]
            if weighted_score > max_score:
                max_score = weighted_score
                max_subject = sub
        except:
            pass
    if max_score == 0:
        return -1
    total_score += max_score
    sub_used.add(max_subject)
    print(total_score)

    # Second Optional
    max_score = 0
    max_subject = ''
    for sub in sub_opt2:
        if sub in sub_used:
            continue
        try:
            weighted_score = scores[sub] * sub_opt2[sub]
            if weighted_score > max_score:
                max_score = weighted_score
                max_subject = sub
        except:
            pass
    if max_score == 0:
        return -1
    total_score += max_score
    sub_used.add(max_subject)
    print(total_score)

    # Free Subjects
    scores_free = {}
    if 'MBO' in sub_fwei:
        try:
            mat_score = scores['MAT'] * sub_fwei['MBO']
        except:
            mat_score = 0
        try:
            mep_score = scores['MEP'] * sub_fwei['MEP']
        except:
            mep_score = 0
        scores_free['MBO'] = max(mat_score, mep_score)
        sub_used.add('MAT')
        sub_used.add('MEP')
    for sub in scores:
        if sub in sub_used:
            continue
        try:
            weighted_score = scores[sub] * sub_fwei[sub]
        except:
            weighted_score = scores[sub]
        scores_free[sub] = weighted_score
    n = min(int(sub_free), len(scores_free))
    scores_sort = sorted(scores_free.values(), reverse=True)
    scores_topn = scores_sort[:n]
    total_score += sum(scores_topn)
    print(total_score)

    # Extra Subject Bonus
    bonus_rate = sub_free - int(sub_free)
    if len(scores_sort) > n:
        total_score += scores_sort[n] * bonus_rate
    print(total_score)

    return 1


main()
